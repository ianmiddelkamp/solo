require "test_helper"

class ClientsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  test "create makes the client and its primary contact together" do
    assert_difference [ "Client.count", "Contact.count" ], 1 do
      post "/clients",
        params: { client: { name: "New Client" }, contact: { name: "Jane Doe", email: "jane@example.com" } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :created

    body = JSON.parse(response.body)
    assert_equal 1, body["contacts"].size
    assert body["contacts"].first["primary"]
    assert_equal "Jane Doe", body["contacts"].first["name"]
  end

  test "create rolls back the client if the primary contact is invalid" do
    assert_no_difference [ "Client.count", "Contact.count" ] do
      post "/clients",
        params: { client: { name: "New Client" }, contact: { name: "" } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :unprocessable_entity
  end

  test "create rolls back the contact if the client is invalid" do
    assert_no_difference [ "Client.count", "Contact.count" ] do
      post "/clients",
        params: { client: { name: "" }, contact: { name: "Jane Doe" } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :unprocessable_entity
  end

  test "index includes each client's primary contact" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    client.contacts.create!(name: "Primary", email: "primary@example.com", primary: true)

    get "/clients", headers: auth_headers(users(:admin))
    assert_response :success

    body = JSON.parse(response.body).find { |c| c["id"] == client.id }
    assert_equal "Primary", body["primary_contact"]["name"]
  end

  test "index excludes archived clients by default and includes them with show_archived" do
    bp = BusinessProfile.for_user(users(:admin))
    active = bp.clients.create!(name: "Active Client")
    active.contacts.create!(name: "Contact", primary: true)
    archived = bp.clients.create!(name: "Archived Client", is_archived: true)
    archived.contacts.create!(name: "Contact", primary: true)

    get "/clients", headers: auth_headers(users(:admin))
    ids = JSON.parse(response.body).map { |c| c["id"] }
    assert_includes ids, active.id
    refute_includes ids, archived.id

    get "/clients", params: { show_archived: "true" }, headers: auth_headers(users(:admin))
    ids = JSON.parse(response.body).map { |c| c["id"] }
    assert_includes ids, active.id
    assert_includes ids, archived.id
  end

  test "archive sets is_archived and cascades to the client's projects" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    client.contacts.create!(name: "Contact", primary: true)
    project = client.projects.create!(name: "Project")

    patch "/clients/#{client.id}/archive",
      params: { client: { is_archived: true } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    assert client.reload.is_archived
    assert project.reload.is_archived
  end

  test "unarchiving a client does not unarchive its projects" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client", is_archived: true)
    client.contacts.create!(name: "Contact", primary: true)
    project = client.projects.create!(name: "Project", is_archived: true)

    patch "/clients/#{client.id}/archive",
      params: { client: { is_archived: false } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    refute client.reload.is_archived
    assert project.reload.is_archived
  end

  test "delete route no longer exists for clients" do
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client")
    client.contacts.create!(name: "Contact", primary: true)

    delete "/clients/#{client.id}", headers: auth_headers(users(:admin))
    assert_response :not_found
  end
end
