require "test_helper"

class InvitationsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  test "admin can create an invitation" do
    assert_difference "User.count", 1 do
      post "/invitations",
        params: { invitation: { email: "brandnew@example.com" } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :created

    invited = User.find_by(email: "brandnew@example.com")
    assert invited.invited?
    assert_equal users(:admin).id, invited.invited_by_id

    mail = ActionMailer::Base.deliveries.last
    assert_equal [ "brandnew@example.com" ], mail.to
  end

  test "non-admin cannot create an invitation" do
    assert_no_difference "User.count" do
      post "/invitations",
        params: { invitation: { email: "nope@example.com" } }.to_json,
        headers: auth_headers(users(:member)).merge("Content-Type" => "application/json")
    end
    assert_response :forbidden
  end

  test "unauthenticated request cannot create an invitation" do
    post "/invitations",
      params: { invitation: { email: "nope2@example.com" } }.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :unauthorized
  end

  test "show returns the invited email for a valid token" do
    get "/invitations/#{users(:pending_invite).invite_token}"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal users(:pending_invite).email, body["email"]
  end

  test "show returns not_found for an invalid token" do
    get "/invitations/does-not-exist"
    assert_response :not_found
  end

  test "accept sets password and logs the user in" do
    post "/invitations/#{users(:pending_invite).invite_token}/accept",
      params: { name: "Newly Accepted", password: "brandnewpass1" }.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :success

    body = JSON.parse(response.body)
    assert body["token"].present?
    assert_equal "Newly Accepted", body["user"]["name"]

    users(:pending_invite).reload
    assert users(:pending_invite).authenticate("brandnewpass1")
  end

  test "accept fails for an already-accepted invite" do
    token = users(:pending_invite).invite_token

    post "/invitations/#{token}/accept",
      params: { name: "First", password: "brandnewpass1" }.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :success

    post "/invitations/#{token}/accept",
      params: { name: "Second", password: "otherpassword1" }.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :not_found
  end

  test "admin can delete a pending invitation" do
    assert_difference "User.count", -1 do
      delete "/invitations/#{users(:pending_invite).id}",
        headers: auth_headers(users(:admin))
    end
    assert_response :no_content
  end

  test "non-admin cannot delete a pending invitation" do
    assert_no_difference "User.count" do
      delete "/invitations/#{users(:pending_invite).id}",
        headers: auth_headers(users(:member))
    end
    assert_response :forbidden
  end

  test "cannot delete an already-accepted invitation" do
    post "/invitations/#{users(:pending_invite).invite_token}/accept",
      params: { name: "Accepted User", password: "brandnewpass1" }.to_json,
      headers: { "Content-Type" => "application/json" }
    assert_response :success

    assert_no_difference "User.count" do
      delete "/invitations/#{users(:pending_invite).id}",
        headers: auth_headers(users(:admin))
    end
    assert_response :unprocessable_entity
  end

  test "deleting a non-invited user is not_found" do
    assert_no_difference "User.count" do
      delete "/invitations/#{users(:admin).id}",
        headers: auth_headers(users(:admin))
    end
    assert_response :not_found
  end
end
