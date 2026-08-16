require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "requires a password for a normal signup" do
    user = User.new(name: "New User", email: "new@example.com")
    assert_not user.save
    assert_includes user.errors[:password], "can't be blank"
  end

  test "does not require a password when an admin creates an invited user" do
    user = User.new(name: "invited@example.com", email: "invited@example.com", invited_by: users(:admin))
    assert user.save, user.errors.full_messages.to_s
    assert user.invited?
    assert user.invite_token.present?
  end

  test "accept_invite! sets name, password, and accepted_at, and clears the token" do
    user = users(:pending_invite)
    assert user.accept_invite!(name: "Real Name", password: "supersecret1")

    user.reload
    assert_equal "Real Name", user.name
    assert user.authenticate("supersecret1")
    assert user.accepted_at.present?
    assert_nil user.invite_token
    assert_not user.invited?
  end

  test "rejects a password with no digits" do
    user = users(:pending_invite)
    assert_not user.accept_invite!(name: "Real Name", password: "onlyletters")
    assert_includes user.errors[:password], "must include at least one letter and one number"
  end

  test "rejects a password with no letters" do
    user = users(:pending_invite)
    assert_not user.accept_invite!(name: "Real Name", password: "12345678")
    assert_includes user.errors[:password], "must include at least one letter and one number"
  end

  test "admin? reflects the role column" do
    assert users(:admin).admin?
    assert_not users(:member).admin?
  end

  test "normalizes email to lowercase and stripped on save" do
    user = User.new(name: "New User", email: "  New@Example.COM  ", password: "password123")
    assert user.save, user.errors.full_messages.to_s
    assert_equal "new@example.com", user.email
  end

  test "email uniqueness is case-insensitive" do
    user = User.new(name: "Duplicate", email: "ADMIN@EXAMPLE.COM", password: "password123")
    assert_not user.save
    assert_includes user.errors[:email], "has already been taken"
  end
end
