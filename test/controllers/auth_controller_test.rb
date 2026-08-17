require "test_helper"

class AuthControllerTest < ActionDispatch::IntegrationTest
  test "logs in with the exact stored email casing" do
    post "/auth/login", params: { email: "admin@example.com", password: "password123" }
    assert_response :success
  end

  test "logs in regardless of the casing typed" do
    post "/auth/login", params: { email: "Admin@Example.com", password: "password123" }
    assert_response :success
  end

  test "rejects an unknown email" do
    post "/auth/login", params: { email: "nobody@example.com", password: "password123" }
    assert_response :unauthorized
  end

  test "records last_login_at on successful login" do
    assert_nil users(:admin).last_login_at

    post "/auth/login", params: { email: "admin@example.com", password: "password123" }
    assert_response :success

    assert users(:admin).reload.last_login_at.present?
  end

  test "blocks login for an archived user, even with the correct password" do
    users(:admin).archive!

    post "/auth/login", params: { email: "admin@example.com", password: "password123" }
    assert_response :unauthorized
    assert_equal "This account has been deactivated.", JSON.parse(response.body)["error"]
  end
end
