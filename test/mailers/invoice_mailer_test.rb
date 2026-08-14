require "test_helper"

class InvoiceMailerTest < ActionMailer::TestCase
  test "invoice_email sends to the client with the invoice PDF attached" do
    invoice = build_invoice_with_pdf

    mail = InvoiceMailer.invoice_email(invoice)

    assert_equal [ invoice.client.email1 ], mail.to
    assert_match invoice.number, mail.subject
    assert_equal 1, mail.attachments.size
  end

  test "receipt_email sends a payment-received notice to the client" do
    invoice = build_invoice_with_pdf

    mail = InvoiceMailer.receipt_email(invoice)

    assert_equal [ invoice.client.email1 ], mail.to
    assert_match "Payment Received", mail.subject
  end

  private

  def build_invoice_with_pdf
    business = BusinessProfile.create!(user: users(:admin), name: "Acme Co", email: "acme@example.com")
    client   = business.clients.create!(name: "Test Client", email1: "client@example.com")
    invoice  = Invoice.create!(
      client: client, status: "paid",
      total: 123.45, amount_paid: 123.45, paid_at: Time.current
    )
    invoice.pdf.attach(
      io: StringIO.new("%PDF-1.4 fake pdf content"),
      filename: "invoice.pdf",
      content_type: "application/pdf"
    )
    invoice
  end
end
