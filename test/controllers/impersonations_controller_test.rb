require "test_helper"

class ImpersonationsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def impersonation_headers(target, impersonator)
    token = JsonWebToken.encode(user_id: target.id, impersonator_id: impersonator.id)
    { "Authorization" => "Bearer #{token}" }
  end

  test "exiting without an active impersonation is rejected" do
    delete "/impersonation", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
  end

  test "exiting an impersonation ends the session and returns a token for the real admin" do
    session = ImpersonationSession.create!(impersonator: users(:admin), user: users(:member), started_at: Time.current)

    delete "/impersonation", headers: impersonation_headers(users(:member), users(:admin))
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal users(:admin).id, body["user"]["id"]
    assert session.reload.ended_at.present?

    # The returned token should authenticate as the real admin again, not the impersonated user.
    get "/users", headers: { "Authorization" => "Bearer #{body['token']}" }
    assert_response :success
  end

  test "GET requests are allowed while impersonating" do
    get "/clients", headers: impersonation_headers(users(:member), users(:admin))
    assert_response :success
  end

  test "POST requests are blocked while impersonating" do
    post "/clients",
      params: { client: { name: "Should not be created" } }.to_json,
      headers: impersonation_headers(users(:member), users(:admin)).merge("Content-Type" => "application/json")
    assert_response :forbidden
  end

  test "PATCH requests are blocked while impersonating" do
    client = BusinessProfile.for_user(users(:member)).clients.create!(name: "Existing Client")

    patch "/clients/#{client.id}",
      params: { client: { name: "Renamed" } }.to_json,
      headers: impersonation_headers(users(:member), users(:admin)).merge("Content-Type" => "application/json")
    assert_response :forbidden
    assert_equal "Existing Client", client.reload.name
  end

  test "DELETE requests are blocked while impersonating" do
    client = BusinessProfile.for_user(users(:member)).clients.create!(name: "Existing Client")
    project = client.projects.create!(name: "Existing Project")

    assert_no_difference "Project.count" do
      delete "/projects/#{project.id}", headers: impersonation_headers(users(:member), users(:admin))
    end
    assert_response :forbidden
  end

  test "exiting impersonation (a DELETE) is still allowed" do
    ImpersonationSession.create!(impersonator: users(:admin), user: users(:member), started_at: Time.current)

    delete "/impersonation", headers: impersonation_headers(users(:member), users(:admin))
    assert_response :success
  end
end
