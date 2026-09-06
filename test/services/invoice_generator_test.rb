require "test_helper"

class InvoiceGeneratorTest < ActiveSupport::TestCase
  def build_client(tax_rate: 0)
    bp = BusinessProfile.create!(user: nil, name: "Business", tax_rate: tax_rate)
    bp.clients.create!(name: "Client")
  end

  def contact_for(client)
    client.contacts.create!(name: "Contact", primary: true)
  end

  test "hourly project: bills each unbilled entry as its own line, unchanged from today's behavior" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Hourly Project")
    project.rates.create!(rate: 100)
    entry = TimeEntry.create!(user: users(:admin), project: project, date: Date.current, hours: 2, description: "Work")

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_not_nil invoice
    assert_equal 1, invoice.invoice_line_items.count
    item = invoice.invoice_line_items.first
    assert_equal "time", item.kind
    assert_equal entry, item.time_entry
    assert_equal project, item.project
    assert_equal 200, item.amount
    assert_equal 200, invoice.total
    assert_equal invoice.id, entry.reload.invoice_id
  end

  test "stamps task on every kind of time line, regardless of billing mode" do
    client = build_client
    contact = contact_for(client)

    hourly = client.projects.create!(name: "Hourly")
    hourly.rates.create!(rate: 100)
    task = hourly.task_groups.create!(title: "G").tasks.create!(title: "T", status: "todo")
    hourly.time_entries.create!(user: users(:admin), task: task, date: Date.current, hours: 1)

    fixed = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 100)
    fixed.rates.create!(rate: 100)
    fixed_task = fixed.task_groups.create!(title: "G").tasks.create!(title: "T", status: "todo", estimated_hours: 1)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    hourly_line = invoice.invoice_line_items.find_by(project: hourly)
    fixed_line  = invoice.invoice_line_items.find_by(project: fixed, kind: "time")
    assert_equal task, hourly_line.task
    assert_equal fixed_task, fixed_line.task
  end

  test "hourly project with no unbilled entries and no fixed-price projects returns nil" do
    client = build_client
    contact = contact_for(client)
    assert_nil InvoiceGenerator.new(client: client, contact: contact).generate!
  end

  test "fixed price with task breakdown: itemizes nominal task lines plus a true-up adjustment line" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 5000)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    group.tasks.create!(title: "Build", status: "todo", estimated_hours: 30)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_equal 5000, invoice.total
    time_items = invoice.invoice_line_items.where(kind: "time")
    adjustment = invoice.invoice_line_items.find_by(kind: "adjustment")
    assert_equal 2, time_items.count
    assert_equal 4000, time_items.sum(:amount) # (10 + 30) * $100
    assert_equal 1000, adjustment.amount
  end

  test "fixed price with task breakdown: no adjustment line when the nominal total already matches billing_amount" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 4000)
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)
    group.tasks.create!(title: "Build", status: "todo", estimated_hours: 30)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_equal 4000, invoice.total
    assert_equal 2, invoice.invoice_line_items.count
    assert_nil invoice.invoice_line_items.find_by(kind: "adjustment")
  end

  test "fixed price without task breakdown: a single fixed line for the full amount" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(
      name: "Fixed", billing_mode: "fixed_price", billing_amount: 3000, show_task_breakdown: false
    )
    project.rates.create!(rate: 100)
    group = project.task_groups.create!(title: "Phase 1")
    group.tasks.create!(title: "Design", status: "todo", estimated_hours: 10)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_equal 1, invoice.invoice_line_items.count
    item = invoice.invoice_line_items.first
    assert_equal "fixed", item.kind
    assert_equal 3000, item.amount
    assert_equal 3000, invoice.total
  end

  test "fixed price bills with zero logged time entries" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 1500)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_not_nil invoice
    assert_equal 1500, invoice.total
  end

  test "fixed price is billed exactly once — generating again is a no-op" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 1500)

    first = InvoiceGenerator.new(client: client, contact: contact).generate!
    second = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_not_nil first
    assert_nil second
    assert_equal 1, InvoiceLineItem.where(project: project).count
  end

  test "capped project: bills actual hours under the cap with no adjustment" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Capped", billing_mode: "capped", billing_amount: 1000)
    project.rates.create!(rate: 100)
    project.time_entries.create!(user: users(:admin), date: Date.current, hours: 5)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_equal 500, invoice.total
    assert_nil invoice.invoice_line_items.find_by(kind: "adjustment")
  end

  test "capped project: writes off overage with a negative adjustment line, landing exactly at the cap" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Capped", billing_mode: "capped", billing_amount: 100)
    project.rates.create!(rate: 30)
    project.time_entries.create!(user: users(:admin), date: Date.current, hours: 5) # $150 of work

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_equal 100, invoice.total
    adjustment = invoice.invoice_line_items.find_by(kind: "adjustment")
    assert_equal(-50, adjustment.amount)
  end

  test "capped project: raises once the cap is fully consumed instead of producing a $0 invoice" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Capped", billing_mode: "capped", billing_amount: 100)
    project.rates.create!(rate: 100)
    project.time_entries.create!(user: users(:admin), date: Date.current, hours: 1) # exactly consumes the cap

    InvoiceGenerator.new(client: client, contact: contact).generate!
    project.time_entries.create!(user: users(:admin), date: Date.current, hours: 1)

    assert_raises(ArgumentError) do
      InvoiceGenerator.new(client: client, contact: contact).generate!
    end
  end

  test "a single client invoice correctly partitions an hourly project, a fixed project, and charge-code entries" do
    client = build_client
    contact = contact_for(client)

    hourly_project = client.projects.create!(name: "Hourly")
    hourly_project.rates.create!(rate: 100)
    hourly_project.time_entries.create!(user: users(:admin), date: Date.current, hours: 2)

    fixed_project = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 500, show_task_breakdown: false)

    charge_code = users(:admin).charge_codes.create!(code: "ADMIN", rate: 50)
    TimeEntry.create!(user: users(:admin), charge_code: charge_code, client: client, date: Date.current, hours: 1)

    invoice = InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_equal 750, invoice.total # 200 (hourly) + 500 (fixed) + 50 (charge code)
    kinds = invoice.invoice_line_items.group(:kind).count
    assert_equal 2, kinds["time"] # the hourly entry's line + the charge-code entry's line
    assert_equal 1, kinds["fixed"]
  end

  test "unbilled_entries excludes entries already consumed by a fixed-price invoice" do
    client = build_client
    contact = contact_for(client)
    project = client.projects.create!(name: "Fixed", billing_mode: "fixed_price", billing_amount: 500)
    entry = project.time_entries.create!(user: users(:admin), date: Date.current, hours: 3)

    InvoiceGenerator.new(client: client, contact: contact).generate!

    assert_not_nil entry.reload.invoice_id
    assert_nil InvoiceGenerator.new(client: client, contact: contact).generate!
  end
end
