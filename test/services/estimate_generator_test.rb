require "test_helper"

class EstimateGeneratorTest < ActiveSupport::TestCase
  def build_project
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    Project.create!(client: client, name: "Project")
  end

  def contact_for(project)
    project.client.contacts.create!(name: "Contact", primary: true)
  end

  test "generates a line item for a disbursement-only project (no estimable tasks)" do
    project = build_project
    contact = contact_for(project)
    disbursement = project.disbursements.create!(description: "Filing fee", amount: 40)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_not_nil estimate
    assert_equal contact, estimate.contact
    assert_equal 1, estimate.estimate_line_items.count
    item = estimate.estimate_line_items.first
    assert_equal disbursement, item.disbursement
    assert_nil item.task
    assert_equal 40, item.amount
    assert_equal 40, estimate.total
  end

  test "returns nil when the project has no estimable tasks and no disbursements" do
    project = build_project
    contact = contact_for(project)
    assert_nil EstimateGenerator.new(project: project, contact: contact).generate!
  end

  test "includes both task-based and disbursement-based line items, and totals them together" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 2)
    project.disbursements.create!(description: "Travel", amount: 30)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 2, estimate.estimate_line_items.count
    assert_equal 230, estimate.total # 2h * $100 + $30 disbursement
  end

  test "disbursements are excluded from HST even when the business charges tax on labor" do
    bp = BusinessProfile.create!(user: nil, name: "Business", tax_rate: 13)
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project")
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 1)
    project.disbursements.create!(description: "Travel", amount: 30)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    task_item = estimate.estimate_line_items.find { |i| i.task_id.present? }
    disbursement_item = estimate.estimate_line_items.find { |i| i.disbursement_id.present? }

    assert_equal 13, task_item.tax_rate
    assert_equal 0, disbursement_item.tax_rate
    # subtotal 130 + 13% tax on the $100 labor line only ($13) = 143, disbursement untaxed
    assert_equal 143, estimate.total
  end

  test "every generated estimate includes every disbursement, paid or unpaid, every time" do
    project = build_project
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 1)
    project.disbursements.create!(description: "Travel", amount: 30, paid: true)

    first  = EstimateGenerator.new(project: project, contact: contact).generate!
    second = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 2, first.estimate_line_items.count
    assert_equal 2, second.estimate_line_items.count
  end

  test "fixed price with task breakdown: total matches billing_amount via a true-up adjustment line" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project", billing_mode: "fixed_price", billing_amount: 5000)
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    group.tasks.create!(title: "Build", status: "todo", estimated_hours: 30)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 5000, estimate.total
    assert_equal 3, estimate.estimate_line_items.count # 2 task lines + 1 adjustment
  end

  test "fixed price with task breakdown: no adjustment line when the nominal total already matches billing_amount" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project", billing_mode: "fixed_price", billing_amount: 4000)
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    group.tasks.create!(title: "Build", status: "todo", estimated_hours: 30)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 4000, estimate.total
    assert_equal 2, estimate.estimate_line_items.count
    assert_nil estimate.estimate_line_items.find { |i| i.description == "Fixed price adjustment" }
  end

  test "fixed price without task breakdown: a single line at billing_amount" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(
      client: client, name: "Project", billing_mode: "fixed_price", billing_amount: 3000, show_task_breakdown: false
    )
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 1, estimate.estimate_line_items.count
    assert_equal 3000, estimate.total
  end

  test "fixed price estimate can generate with no estimable tasks" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project", billing_mode: "fixed_price", billing_amount: 1500)
    contact = contact_for(project)

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_not_nil estimate
    assert_equal 1500, estimate.total
  end

  test "capped project: itemizes tasks normally when their nominal total is under the cap" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project", billing_mode: "capped", billing_amount: 1000)
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 5) # $500, under the $1000 cap

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 500, estimate.total
    assert_nil estimate.estimate_line_items.find { |i| i.description == "Billing cap adjustment" }
  end

  test "capped project: writes down to the cap when the nominal total exceeds it" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project", billing_mode: "capped", billing_amount: 1000)
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 5)
    group.tasks.create!(title: "Build", status: "todo", estimated_hours: 10) # nominal $1500

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 1000, estimate.total
    adjustment = estimate.estimate_line_items.find { |i| i.description == "Billing cap adjustment" }
    assert_equal(-500, adjustment.amount)
  end

  test "capped project: the estimate's ceiling is the cap's remaining room, net of what's already been invoiced" do
    bp = BusinessProfile.create!(user: nil, name: "Business")
    client = bp.clients.create!(name: "Client")
    project = Project.create!(client: client, name: "Project", billing_mode: "capped", billing_amount: 1000)
    contact = contact_for(project)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 5) # nominal $500, under the full cap...

    invoice = Invoice.create!(client: client, contact: contact, status: "pending")
    InvoiceLineItem.create!(
      invoice: invoice, project: project, kind: "time", description: "prior work",
      hours: 4, rate: 100, amount: 400, tax_rate: 0
    ) # ...but only $600 of the $1000 cap remains

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    assert_equal 500, estimate.total # still under the $600 remaining room, no adjustment needed
    assert_nil estimate.estimate_line_items.find { |i| i.description == "Billing cap adjustment" }
  end

  test "stores whichever contact is passed in, not necessarily the primary" do
    project = build_project
    primary = contact_for(project)
    secondary = project.client.contacts.create!(name: "Secondary")
    project.disbursements.create!(description: "Filing fee", amount: 10)

    estimate = EstimateGenerator.new(project: project, contact: secondary).generate!

    assert_equal secondary, estimate.contact
    assert_not_equal primary, estimate.contact
  end
end
