# Preview all emails at http://localhost:3000/rails/mailers/invoice_mailer
class InvoiceMailerPreview < ActionMailer::Preview
  # Preview this email at http://localhost:3000/rails/mailers/invoice_mailer/invoice_email
  def invoice_email
    InvoiceMailer.invoice_email(Invoice.joins(:contact).where.not(contacts: { email: nil }).last)
  end

  # Preview this email at http://localhost:3000/rails/mailers/invoice_mailer/receipt_email
  def receipt_email
    InvoiceMailer.receipt_email(Invoice.joins(:contact).where.not(contacts: { email: nil }).last)
  end
end
