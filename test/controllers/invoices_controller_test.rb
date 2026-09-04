require "test_helper"

class InvoicesControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def setup
    @bp = BusinessProfile.for_user(users(:admin))
    @client = @bp.clients.create!(name: "Client")
    @primary = @client.contacts.create!(name: "Primary", email: "primary@example.com", primary: true)
    @project = Project.create!(client: @client, name: "Project")
    TimeEntry.create!(user: users(:admin), project: @project, date: Date.current, hours: 2)
  end

  test "create defaults to the client's primary contact when none is given" do
    stub_pdf_rendering do
      post "/invoices", params: { client_id: @client.id }, headers: auth_headers(users(:admin))
    end
    assert_response :created

    body = JSON.parse(response.body)
    assert_equal @primary.id, body["contact"]["id"]
  end

  test "create rejects a contact belonging to a different client" do
    other_client = @bp.clients.create!(name: "Other Client")
    other_contact = other_client.contacts.create!(name: "Other", primary: true)

    post "/invoices", params: { client_id: @client.id, contact_id: other_contact.id }, headers: auth_headers(users(:admin))
    assert_response :not_found
  end

  test "update can change the stored contact" do
    secondary = @client.contacts.create!(name: "Secondary")
    invoice = InvoiceGenerator.new(client: @client, contact: @primary).generate!

    patch "/invoices/#{invoice.id}",
      params: { invoice: { contact_id: secondary.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    assert_equal secondary, invoice.reload.contact
  end

  test "update regenerates the attached PDF when the contact changes, so it never goes stale" do
    secondary = @client.contacts.create!(name: "Secondary")
    invoice = InvoiceGenerator.new(client: @client, contact: @primary).generate!
    invoice.pdf.attach(io: StringIO.new("stale pdf content"), filename: "i.pdf", content_type: "application/pdf")

    stub_pdf_rendering do
      patch "/invoices/#{invoice.id}",
        params: { invoice: { contact_id: secondary.id } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :success

    assert_equal "%PDF-1.4 fake pdf content", invoice.reload.pdf.download
  end

  test "update does NOT regenerate the PDF when the contact isn't changing (e.g. a status-only update)" do
    invoice = InvoiceGenerator.new(client: @client, contact: @primary).generate!
    invoice.pdf.attach(io: StringIO.new("original pdf content"), filename: "i.pdf", content_type: "application/pdf")

    patch "/invoices/#{invoice.id}",
      params: { invoice: { status: "sent" } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    assert_equal "original pdf content", invoice.reload.pdf.download
  end

  test "update rejects a contact belonging to a different client" do
    invoice = InvoiceGenerator.new(client: @client, contact: @primary).generate!
    other_client = @bp.clients.create!(name: "Other Client")
    other_contact = other_client.contacts.create!(name: "Other", primary: true)

    patch "/invoices/#{invoice.id}",
      params: { invoice: { contact_id: other_contact.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :unprocessable_entity
    assert_equal @primary, invoice.reload.contact
  end

  test "send-time contact override doesn't mutate the invoice's stored contact" do
    secondary = @client.contacts.create!(name: "Secondary", email: "secondary@example.com")
    invoice = InvoiceGenerator.new(client: @client, contact: @primary).generate!
    invoice.pdf.attach(io: StringIO.new("fake pdf"), filename: "i.pdf", content_type: "application/pdf")

    post "/invoices/#{invoice.id}/send_invoice",
      params: { contact_id: secondary.id }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    body = JSON.parse(response.body)
    assert_includes body["message"], secondary.email
    assert_equal @primary, invoice.reload.contact
  end

  test "export returns csv, xlsx, and md for supported formats" do
    InvoiceGenerator.new(client: @client, contact: @primary).generate!

    get "/invoices/export", params: { format: "csv" }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_includes response.body, @client.name

    get "/invoices/export", params: { format: "xlsx" }, headers: auth_headers(users(:admin))
    assert_response :success

    get "/invoices/export", params: { format: "md" }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_includes response.body, "# Invoices"
  end

  test "export rejects an unsupported format" do
    get "/invoices/export", params: { format: "pdf" }, headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
  end
end
