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
end
