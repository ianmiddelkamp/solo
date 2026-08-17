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
end
