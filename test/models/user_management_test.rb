require "test_helper"

class UserManagementTest < ActiveSupport::TestCase
  test "archive! sets archived_at, archived? reflects it, unarchive! clears it" do
    user = users(:member)
    assert_not user.archived?

    user.archive!
    assert user.archived?
    assert user.archived_at.present?

    user.unarchive!
    assert_not user.archived?
    assert_nil user.archived_at
  end

  test "generate_reset_password_token! sets a token and timestamp" do
    user = users(:member)
    user.generate_reset_password_token!

    assert user.reset_password_token.present?
    assert user.reset_password_sent_at.present?
  end

  test "reset_password! sets a new password and clears the token" do
    user = users(:member)
    user.generate_reset_password_token!

    assert user.reset_password!(password: "newpassword1")
    user.reload

    assert user.authenticate("newpassword1")
    assert_nil user.reset_password_token
    assert_nil user.reset_password_sent_at
  end

  test "reset_password! rejects a password that fails complexity rules" do
    user = users(:member)
    user.generate_reset_password_token!

    assert_not user.reset_password!(password: "onlyletters")
    assert_includes user.errors[:password], "must include at least one letter and one number"
  end
end
