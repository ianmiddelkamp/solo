require "test_helper"

class ContactsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def setup
    @bp = BusinessProfile.for_user(users(:admin))
    @client = @bp.clients.create!(name: "Client")
    @primary = @client.contacts.create!(name: "Primary", email: "primary@example.com", primary: true)
  end

  test "index only returns contacts for the current user's client" do
    theirs = BusinessProfile.for_user(users(:member))
    their_client = theirs.clients.create!(name: "Their Client")
    their_client.contacts.create!(name: "Theirs", primary: true)

    get "/clients/#{@client.id}/contacts", headers: auth_headers(users(:admin))
    assert_response :success

    ids = JSON.parse(response.body).map { |c| c["id"] }
    assert_equal [ @primary.id ], ids
  end

  test "cannot list contacts on another business's client" do
    theirs = BusinessProfile.for_user(users(:member))
    their_client = theirs.clients.create!(name: "Their Client")

    get "/clients/#{their_client.id}/contacts", headers: auth_headers(users(:admin))
    assert_response :not_found
  end

  test "create adds a non-primary contact" do
    post "/clients/#{@client.id}/contacts",
      params: { contact: { name: "Second", email: "second@example.com" } },
      headers: auth_headers(users(:admin))

    assert_response :created
    assert_equal 2, @client.contacts.count
    assert_not JSON.parse(response.body)["primary"]
  end

  test "create with role_names assigns freeform roles scoped to the client" do
    post "/clients/#{@client.id}/contacts",
      params: { contact: { name: "Second", role_names: ["Billing", "Owner"] } },
      headers: auth_headers(users(:admin))

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal [ "Billing", "Owner" ], body["roles"].map { |r| r["name"] }.sort
    assert_equal 2, @client.roles.count
  end

  test "update can make a different contact primary" do
    second = @client.contacts.create!(name: "Second")

    patch "/clients/#{@client.id}/contacts/#{second.id}",
      params: { contact: { primary: true } },
      headers: auth_headers(users(:admin))

    assert_response :success
    assert second.reload.primary?
    assert_not @primary.reload.primary?
  end

  test "destroy is blocked when it's the client's only contact" do
    delete "/clients/#{@client.id}/contacts/#{@primary.id}", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
    assert @client.contacts.exists?(@primary.id)
  end

  test "destroy is blocked for the primary contact even when others exist" do
    @client.contacts.create!(name: "Second")

    delete "/clients/#{@client.id}/contacts/#{@primary.id}", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
    assert @client.contacts.exists?(@primary.id)
  end

  test "destroy succeeds for a non-primary contact when another contact remains" do
    second = @client.contacts.create!(name: "Second")

    delete "/clients/#{@client.id}/contacts/#{second.id}", headers: auth_headers(users(:admin))
    assert_response :no_content
    assert_not @client.contacts.exists?(second.id)
  end

  test "can delete a former primary after making another contact primary first" do
    second = @client.contacts.create!(name: "Second")
    second.update!(primary: true)

    delete "/clients/#{@client.id}/contacts/#{@primary.id}", headers: auth_headers(users(:admin))
    assert_response :no_content
  end
end
