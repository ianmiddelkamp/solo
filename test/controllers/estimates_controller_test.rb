require "test_helper"

class EstimatesControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  test "index returns only the current user's estimates" do
    # Regression test: BusinessProfile#estimates (has_many through: :projects) requires
    # Project#estimates to exist as the source association — this was previously missing,
    # so GET /estimates 500'd for every request once BusinessProfile scoping was added.
    mine    = BusinessProfile.for_user(users(:admin))
    theirs  = BusinessProfile.for_user(users(:member))

    my_client     = mine.clients.create!(name: "My Client")
    their_client  = theirs.clients.create!(name: "Their Client")
    my_project    = Project.create!(name: "Mine", client: my_client)
    their_project = Project.create!(name: "Theirs", client: their_client)
    my_contact    = my_client.contacts.create!(name: "My Contact", primary: true)
    their_contact = their_client.contacts.create!(name: "Their Contact", primary: true)

    my_estimate    = Estimate.create!(project: my_project, contact: my_contact, status: "draft")
    Estimate.create!(project: their_project, contact: their_contact, status: "draft")

    get "/estimates", headers: auth_headers(users(:admin))
    assert_response :success

    ids = JSON.parse(response.body).map { |e| e["id"] }
    assert_includes ids, my_estimate.id
    assert_equal 1, ids.size
  end

  test "sending and re-showing an estimate with multiple disbursement line items doesn't collide or error" do
    # Regression test: disbursement-based line items all have a nil task_id, so the
    # last_sent_snapshot/diff logic can't key on task_id alone without every disbursement row
    # colliding under the same nil key.
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    client.contacts.create!(name: "Contact", email: "client@example.com", primary: true)
    project = Project.create!(name: "Project", client: client)
    project.disbursements.create!(description: "Travel", amount: 30)
    project.disbursements.create!(description: "Materials", amount: 20)

    estimate = EstimateGenerator.new(project: project, contact: client.primary_contact).generate!
    estimate.pdf.attach(io: StringIO.new("fake pdf"), filename: "e.pdf", content_type: "application/pdf")

    post "/estimates/#{estimate.id}/send_estimate", headers: auth_headers(users(:admin))
    assert_response :success

    get "/estimates/#{estimate.id}", headers: auth_headers(users(:admin))
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 2, body["estimate_line_items"].size
  end

  test "create defaults to the client's primary contact when none is given" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    contact = client.contacts.create!(name: "Primary", email: "primary@example.com", primary: true)
    project = Project.create!(name: "Project", client: client)
    project.disbursements.create!(description: "Filing fee", amount: 10)

    stub_pdf_rendering do
      post "/estimates", params: { project_id: project.id }, headers: auth_headers(users(:admin))
    end
    assert_response :created

    body = JSON.parse(response.body)
    assert_equal contact.id, body["contact"]["id"]
  end

  test "create rejects a contact belonging to a different client" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    client.contacts.create!(name: "Primary", primary: true)
    project = Project.create!(name: "Project", client: client)
    project.disbursements.create!(description: "Filing fee", amount: 10)

    other_client = bp.clients.create!(name: "Other Client")
    other_contact = other_client.contacts.create!(name: "Other", primary: true)

    post "/estimates", params: { project_id: project.id, contact_id: other_contact.id }, headers: auth_headers(users(:admin))
    assert_response :not_found
  end

  test "update can change the stored contact" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    primary = client.contacts.create!(name: "Primary", primary: true)
    secondary = client.contacts.create!(name: "Secondary")
    project = Project.create!(name: "Project", client: client)
    estimate = Estimate.create!(project: project, contact: primary, status: "draft")

    patch "/estimates/#{estimate.id}",
      params: { estimate: { contact_id: secondary.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    assert_equal secondary, estimate.reload.contact
  end

  test "update regenerates the attached PDF when the contact changes, so it never goes stale" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    primary = client.contacts.create!(name: "Primary", primary: true)
    secondary = client.contacts.create!(name: "Secondary")
    project = Project.create!(name: "Project", client: client)
    estimate = Estimate.create!(project: project, contact: primary, status: "draft")
    estimate.pdf.attach(io: StringIO.new("stale pdf content"), filename: "e.pdf", content_type: "application/pdf")

    stub_pdf_rendering do
      patch "/estimates/#{estimate.id}",
        params: { estimate: { contact_id: secondary.id } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :success

    assert_equal "%PDF-1.4 fake pdf content", estimate.reload.pdf.download
  end

  test "update does NOT regenerate the PDF when the contact isn't changing (e.g. a status-only update)" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    contact = client.contacts.create!(name: "Primary", primary: true)
    project = Project.create!(name: "Project", client: client)
    estimate = Estimate.create!(project: project, contact: contact, status: "draft")
    estimate.pdf.attach(io: StringIO.new("original pdf content"), filename: "e.pdf", content_type: "application/pdf")

    patch "/estimates/#{estimate.id}",
      params: { estimate: { status: "sent" } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    assert_equal "original pdf content", estimate.reload.pdf.download
  end

  test "update rejects a contact belonging to a different client" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    primary = client.contacts.create!(name: "Primary", primary: true)
    project = Project.create!(name: "Project", client: client)
    estimate = Estimate.create!(project: project, contact: primary, status: "draft")

    other_client = bp.clients.create!(name: "Other Client")
    other_contact = other_client.contacts.create!(name: "Other", primary: true)

    patch "/estimates/#{estimate.id}",
      params: { estimate: { contact_id: other_contact.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :unprocessable_entity
    assert_equal primary, estimate.reload.contact
  end

  test "send-time contact override doesn't mutate the estimate's stored contact" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    primary = client.contacts.create!(name: "Primary", email: "primary@example.com", primary: true)
    secondary = client.contacts.create!(name: "Secondary", email: "secondary@example.com")
    project = Project.create!(name: "Project", client: client)
    project.disbursements.create!(description: "Filing fee", amount: 10)
    estimate = EstimateGenerator.new(project: project, contact: primary).generate!
    estimate.pdf.attach(io: StringIO.new("fake pdf"), filename: "e.pdf", content_type: "application/pdf")

    post "/estimates/#{estimate.id}/send_estimate",
      params: { contact_id: secondary.id }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    body = JSON.parse(response.body)
    assert_includes body["message"], secondary.email
    assert_equal primary, estimate.reload.contact
  end
end
