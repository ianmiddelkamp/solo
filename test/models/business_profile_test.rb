require "test_helper"

class BusinessProfileTest < ActiveSupport::TestCase
  test "gmail_app_password is encrypted at rest" do
    profile = BusinessProfile.create!(user: users(:admin), name: "Acme", gmail_user: "acme@gmail.com", gmail_app_password: "supersecretapppw")

    raw = ActiveRecord::Base.connection.select_value(
      "SELECT gmail_app_password FROM business_profiles WHERE id = #{profile.id}"
    )

    assert_not_equal "supersecretapppw", raw
    assert_equal "supersecretapppw", profile.reload.gmail_app_password
  end

  test "email_configured? requires both gmail_user and gmail_app_password" do
    profile = BusinessProfile.new(user: users(:admin), name: "Acme")
    assert_not profile.email_configured?

    profile.gmail_user = "acme@gmail.com"
    assert_not profile.email_configured?

    profile.gmail_app_password = "supersecretapppw"
    assert profile.email_configured?
  end
end
