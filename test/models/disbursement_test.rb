require "test_helper"

class DisbursementTest < ActiveSupport::TestCase
  def project
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = Client.create!(business_profile: bp, name: "Client")
    Project.create!(client: client, name: "Project")
  end

  test "requires a description and a positive amount" do
    d = Disbursement.new(project: project)
    assert_not d.save
    assert_includes d.errors[:description], "can't be blank"
    assert_includes d.errors[:amount], "can't be blank"

    d.description = "Filing fee"
    d.amount = 0
    assert_not d.save
    assert_includes d.errors[:amount], "must be greater than 0"

    d.amount = 25.50
    assert d.save, d.errors.full_messages.to_s
  end
end
