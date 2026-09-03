require "test_helper"

class PasswordResetMailerTest < ActionMailer::TestCase
  test "uses the sender's business, not the target user's, for from/SMTP credentials" do
    # Regression test: the target user being reset hasn't logged in yet, so they can't have
    # configured their own business's email credentials — the mailer must use the sender's
    # (the admin who triggered the reset) business, matching InviteMailer's pattern, not the
    # target's. Using the target's business here previously caused every real (SMTP) send to
    # fail via ApplicationMailer's email_configured? guard.
    sender = users(:admin)
    sender_business = BusinessProfile.create!(user: sender, name: "Sender Co", email: "sender@example.com")

    target = users(:member)
    target.generate_reset_password_token!

    mail = PasswordResetMailer.reset(target, sender)

    assert_equal [ target.email ], mail.to
    assert_includes mail.from.first, sender_business.email
  end

  test "includes a working reset link with the target's token" do
    sender = users(:admin)
    target = users(:member)
    target.generate_reset_password_token!

    mail = PasswordResetMailer.reset(target, sender)

    assert_includes mail.body.encoded, target.reset_password_token
  end
end
