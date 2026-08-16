require "test_helper"

class InvoiceNumberingTest < ActiveSupport::TestCase
  def business_profile(name)
    BusinessProfile.create!(user: nil, name: name)
  end

  def client_for(business_profile)
    Client.create!(business_profile: business_profile, name: "Client #{business_profile.id}")
  end

  test "two different businesses' invoices both start at 0001" do
    client_a = client_for(business_profile("Business A"))
    client_b = client_for(business_profile("Business B"))

    invoice_a = Invoice.create!(client: client_a, status: "pending")
    invoice_b = Invoice.create!(client: client_b, status: "pending")

    assert_equal "INV-0001", invoice_a.number
    assert_equal "INV-0001", invoice_b.number
  end

  test "a second invoice for the same business increments" do
    client = client_for(business_profile("Business A"))

    first = Invoice.create!(client: client, status: "pending")
    second = Invoice.create!(client: client, status: "pending")

    assert_equal "INV-0001", first.number
    assert_equal "INV-0002", second.number
  end

  test "deleting an invoice and creating another doesn't reuse or collide" do
    client = client_for(business_profile("Business A"))

    first = Invoice.create!(client: client, status: "pending")
    second = Invoice.create!(client: client, status: "pending")
    first.destroy!

    third = Invoice.create!(client: client, status: "pending")

    assert_equal "INV-0003", third.number
    assert_not_equal second.sequence_number, third.sequence_number
  end

  test "self-healing: assignment doesn't collide even if the stored counter is stale" do
    profile = business_profile("Business A")
    client = client_for(profile)

    high_water_mark = Invoice.create!(client: client, status: "pending")
    high_water_mark.update_column(:sequence_number, 10)
    profile.update!(next_invoice_number: 1)

    next_invoice = Invoice.create!(client: client, status: "pending")

    assert_equal "INV-0011", next_invoice.number
  end
end
