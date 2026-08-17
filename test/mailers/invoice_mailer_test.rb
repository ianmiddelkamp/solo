require "test_helper"

class InvoiceMailerTest < ActionMailer::TestCase
  test "invoice_email sends to the invoice's contact with the invoice PDF attached" do
    invoice = build_invoice_with_pdf

    mail = InvoiceMailer.invoice_email(invoice)

    assert_equal [ invoice.contact.email ], mail.to
    assert_match invoice.number, mail.subject
    assert_equal 1, mail.attachments.size
  end

  test "receipt_email sends a payment-received notice to the invoice's contact" do
    invoice = build_invoice_with_pdf

    mail = InvoiceMailer.receipt_email(invoice)

    assert_equal [ invoice.contact.email ], mail.to
    assert_match "Payment Received", mail.subject
  end

  test "an explicit contact override wins over the invoice's stored contact" do
    invoice = build_invoice_with_pdf
    override = invoice.client.contacts.create!(name: "Override", email: "override@example.com")

    mail = InvoiceMailer.invoice_email(invoice, override)

    assert_equal [ override.email ], mail.to
  end

  private

  def build_invoice_with_pdf
    business = BusinessProfile.create!(user: nil, name: "Acme Co", email: "acme@example.com")
    client   = business.clients.create!(name: "Test Client")
    contact  = client.contacts.create!(name: "Test Contact", email: "client@example.com", primary: true)
    invoice  = Invoice.create!(
      client: client, contact: contact, status: "paid",
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
