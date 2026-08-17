require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  test "non-admin can't list users" do
    get "/users", headers: auth_headers(users(:member))
    assert_response :forbidden
  end

  test "index only returns accepted users, not pending invites" do
    get "/users", headers: auth_headers(users(:admin))
    assert_response :success

    ids = JSON.parse(response.body).map { |u| u["id"] }
    assert_includes ids, users(:admin).id
    assert_includes ids, users(:member).id
    assert_not_includes ids, users(:pending_invite).id
  end

  test "admin can't change their own role" do
    patch "/users/#{users(:admin).id}", params: { user: { role: "member" } }, headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
    assert_equal "admin", users(:admin).reload.role
  end

  test "admin can update another user's role" do
    patch "/users/#{users(:member).id}", params: { user: { role: "admin" } }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_equal "admin", users(:member).reload.role
  end

  test "admin can't archive their own account" do
    post "/users/#{users(:admin).id}/archive", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
    assert_not users(:admin).reload.archived?
  end

  test "archive then unarchive a user" do
    post "/users/#{users(:member).id}/archive", headers: auth_headers(users(:admin))
    assert_response :success
    assert users(:member).reload.archived?

    post "/users/#{users(:member).id}/unarchive", headers: auth_headers(users(:admin))
    assert_response :success
    assert_not users(:member).reload.archived?
  end

  test "send_password_reset generates a token" do
    post "/users/#{users(:member).id}/send_password_reset", headers: auth_headers(users(:admin))
    assert_response :success
    assert users(:member).reload.reset_password_token.present?
  end

  test "can't impersonate yourself" do
    post "/users/#{users(:admin).id}/impersonate", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
  end

  test "can't impersonate another admin" do
    other_admin = User.create!(name: "Other Admin", email: "other-admin@example.com", role: "admin", password: "password123", accepted_at: Time.current)
    post "/users/#{other_admin.id}/impersonate", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
  end

  test "can't impersonate an archived user" do
    users(:member).archive!
    post "/users/#{users(:member).id}/impersonate", headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
  end

  test "impersonate creates a session and returns a token that resolves to the target" do
    assert_difference "ImpersonationSession.count", 1 do
      post "/users/#{users(:member).id}/impersonate", headers: auth_headers(users(:admin))
    end
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal users(:member).id, body["user"]["id"]

    session = ImpersonationSession.last
    assert_equal users(:admin).id, session.impersonator_id
    assert_equal users(:member).id, session.user_id
    assert_nil session.ended_at

    # The returned token should authenticate future requests as the target user.
    get "/clients", headers: { "Authorization" => "Bearer #{body['token']}" }
    assert_response :success
  end
end
