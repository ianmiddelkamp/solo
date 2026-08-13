require "test_helper"

class ApplicationMailerTest < ActionMailer::TestCase
  class DummyMailer < ApplicationMailer
    def send_it(business)
      @business = business
      deliver_mail(to: "client@example.com", subject: "Hi", body: "Hello", content_type: "text/plain")
    end
  end

  # Simulates production's SMTP delivery method, since the test environment normally uses
  # the :test delivery method (see config/environments/test.rb) where this check is a no-op.
  class SmtpDummyMailer < DummyMailer
    private

    def smtp_delivery?
      true
    end
  end

  test "raises when SMTP delivery is used and the business hasn't configured email" do
    business = BusinessProfile.new(user: users(:member), name: "No Creds Inc")

    assert_raises(ApplicationMailer::EmailNotConfiguredError) do
      SmtpDummyMailer.send_it(business).deliver_now
    end
  end

  test "does not raise when SMTP delivery is used and the business has configured email" do
    business = BusinessProfile.new(
      user: users(:member), name: "Has Creds Inc",
      gmail_user: "hascreds@gmail.com", gmail_app_password: "supersecretapppw"
    )

    assert_nothing_raised do
      SmtpDummyMailer.send_it(business).deliver_now
    end
  end

  test "does not raise for non-SMTP delivery even without configured email (dev/test)" do
    business = BusinessProfile.new(user: users(:member), name: "No Creds Inc")

    assert_nothing_raised do
      DummyMailer.send_it(business).deliver_now
    end
  end
end
