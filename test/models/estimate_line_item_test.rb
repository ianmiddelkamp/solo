require "test_helper"

class EstimateLineItemTest < ActiveSupport::TestCase
  def build_project(billing_mode: "hourly", billing_amount: nil, show_actual_hours: true)
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    Project.create!(
      client: client, name: "Project",
      billing_mode: billing_mode, billing_amount: billing_amount, show_actual_hours: show_actual_hours
    )
  end

  def build_done_task_item(project, estimated_hours:, actual_hours:)
    contact = project.client.contacts.create!(name: "Contact", primary: true)
    estimate = Estimate.create!(project: project, contact: contact, status: "draft")
    group = project.task_groups.create!(title: "Phase 1")
    task = group.tasks.create!(title: "Design", status: "done", estimated_hours: estimated_hours)
    entry = project.time_entries.create!(user: users(:admin), task: task, date: Date.current, hours: actual_hours)
    item = EstimateLineItem.create!(
      estimate: estimate, task: task, description: "Design", hours: estimated_hours, rate: 100,
      amount: estimated_hours * 100, tax_rate: 0
    )
    [item, entry]
  end

  test "hourly project with show_actual_hours on substitutes actual hours for a done task" do
    project = build_project(billing_mode: "hourly", show_actual_hours: true)
    item, _entry = build_done_task_item(project, estimated_hours: 10, actual_hours: 4)

    assert_equal 4, item.display_hours
    assert_equal 400, item.display_amount
  end

  test "hourly project with show_actual_hours off keeps showing the original estimate" do
    project = build_project(billing_mode: "hourly", show_actual_hours: false)
    item, _entry = build_done_task_item(project, estimated_hours: 10, actual_hours: 4)

    assert_equal 10, item.display_hours
    assert_equal 1000, item.display_amount
  end

  test "fixed price project never substitutes actual hours, even with show_actual_hours on" do
    project = build_project(billing_mode: "fixed_price", billing_amount: 5000, show_actual_hours: true)
    item, _entry = build_done_task_item(project, estimated_hours: 10, actual_hours: 4)

    assert_equal 10, item.display_hours
    assert_equal 1000, item.display_amount
  end

  test "regression: a fixed-price estimate's total still equals billing_amount after a task's actual hours diverge from its estimate" do
    project = build_project(billing_mode: "fixed_price", billing_amount: 5000)
    contact = project.client.contacts.create!(name: "Contact", primary: true)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    build_task = group.tasks.create!(title: "Build", status: "todo", estimated_hours: 30)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!
    assert_equal 5000, estimate.total # sanity: matches the earlier estimate_generator_test coverage

    # Task finishes taking far less time than estimated — before this fix, the adjustment line
    # (baked in at generation time from *estimated* hours) would go stale while the task's own
    # line silently swapped to actual hours, pulling the effective total off billing_amount.
    build_task.update!(status: "done")
    project.time_entries.create!(user: users(:admin), task: build_task, date: Date.current, hours: 5)

    effective_total = estimate.estimate_line_items.reload.sum(&:display_amount)
    assert_equal 5000, effective_total
  end
end
