require "test_helper"

class ProjectFixedPriceDriftTest < ActiveSupport::TestCase
  def build_project
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    Project.create!(client: client, name: "Project", billing_mode: "fixed_price", billing_amount: 5000)
  end

  def contact_for(project)
    project.client.contacts.create!(name: "Contact", primary: true)
  end

  test "returns nil when there's no estimate yet to compare against" do
    project = build_project
    project.rates.create!(rate: 100)
    project.task_groups.create!(title: "Phase 1").tasks.create!(title: "Design", status: "todo", estimated_hours: 10)

    assert_nil project.fixed_price_quote_drift
  end

  test "returns nil when nothing has changed since the estimate was quoted" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    project.task_groups.create!(title: "Phase 1").tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    EstimateGenerator.new(project: project, contact: contact).generate!

    assert_nil project.fixed_price_quote_drift
  end

  test "detects a task's hours changing after the quote" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    task = project.task_groups.create!(title: "Phase 1").tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    EstimateGenerator.new(project: project, contact: contact).generate!

    task.update!(estimated_hours: 20)

    drift = project.fixed_price_quote_drift
    assert_not_nil drift
    assert_equal 1, drift[:changed].size
    assert_includes drift[:changed].first, "Design"
  end

  test "detects a task added after the quote" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    EstimateGenerator.new(project: project, contact: contact).generate!

    group.tasks.create!(title: "Build", status: "todo", estimated_hours: 15)

    drift = project.fixed_price_quote_drift
    assert_equal ["Phase 1 · Build"], drift[:added]
  end

  test "detects a task removed (its estimate cleared) after the quote" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    task = group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    EstimateGenerator.new(project: project, contact: contact).generate!

    task.update!(estimated_hours: nil)

    drift = project.fixed_price_quote_drift
    assert_equal 1, drift[:removed].size
  end

  test "prefers the accepted estimate over a later draft when both exist" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    task = group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)

    accepted = EstimateGenerator.new(project: project, contact: contact).generate!
    accepted.update!(status: "accepted")

    task.update!(estimated_hours: 20)
    EstimateGenerator.new(project: project, contact: contact).generate! # a later, unaccepted draft

    drift = project.fixed_price_quote_drift
    assert_equal accepted.number, drift[:reference]
  end
end
