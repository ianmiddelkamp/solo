require "test_helper"

class EstimateNumberingTest < ActiveSupport::TestCase
  def business_profile(name)
    BusinessProfile.create!(user: nil, name: name)
  end

  def project_for(business_profile)
    client = Client.create!(business_profile: business_profile, name: "Client #{business_profile.id}")
    Project.create!(client: client, name: "Project #{client.id}")
  end

  test "two different businesses' estimates both start at 0001" do
    project_a = project_for(business_profile("Business A"))
    project_b = project_for(business_profile("Business B"))

    estimate_a = Estimate.create!(project: project_a)
    estimate_b = Estimate.create!(project: project_b)

    assert_equal "EST-0001", estimate_a.number
    assert_equal "EST-0001", estimate_b.number
  end

  test "a second estimate for the same business increments" do
    project = project_for(business_profile("Business A"))

    first = Estimate.create!(project: project)
    second = Estimate.create!(project: project)

    assert_equal "EST-0001", first.number
    assert_equal "EST-0002", second.number
  end

  test "deleting an estimate and creating another doesn't reuse or collide" do
    project = project_for(business_profile("Business A"))

    first = Estimate.create!(project: project)
    second = Estimate.create!(project: project)
    first.destroy!

    third = Estimate.create!(project: project)

    assert_equal "EST-0003", third.number
    assert_not_equal second.sequence_number, third.sequence_number
  end

  test "self-healing: assignment doesn't collide even if the stored counter is stale" do
    profile = business_profile("Business A")
    project = project_for(profile)

    high_water_mark = Estimate.create!(project: project)
    high_water_mark.update_column(:sequence_number, 35)
    profile.update!(next_estimate_number: 1)

    next_estimate = Estimate.create!(project: project)

    assert_equal "EST-0036", next_estimate.number
  end
end
