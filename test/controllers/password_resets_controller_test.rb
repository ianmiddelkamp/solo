require "test_helper"

class PasswordResetsControllerTest < ActionDispatch::IntegrationTest
  test "show returns the email for a valid token" do
    user = users(:member)
    user.generate_reset_password_token!

    get "/password_resets/#{user.reset_password_token}"
    assert_response :success
    assert_equal user.email, JSON.parse(response.body)["email"]
  end

  test "show rejects an unknown token" do
    get "/password_resets/not-a-real-token"
    assert_response :not_found
  end

  test "show rejects an expired token" do
    user = users(:member)
    user.generate_reset_password_token!
    user.update_column(:reset_password_sent_at, 3.hours.ago)

    get "/password_resets/#{user.reset_password_token}"
    assert_response :not_found
  end

  test "update resets the password and returns a working token" do
    user = users(:member)
    user.generate_reset_password_token!

    patch "/password_resets/#{user.reset_password_token}", params: { password: "brandnew1" }
    assert_response :success

    user.reload
    assert user.authenticate("brandnew1")
    assert_nil user.reset_password_token

    body = JSON.parse(response.body)
    get "/clients", headers: { "Authorization" => "Bearer #{body['token']}" }
    assert_response :success
  end
end
