class InvoiceMailer < ApplicationMailer
  def invoice_email(invoice, contact = nil)
    set_up(invoice, contact)

    deliver_mail(
      to:      @contact.email,
      subject: "Invoice #{invoice.number} from #{@business.name.presence || 'us'}"
    )
  end

  def receipt_email(invoice, contact = nil)
    set_up(invoice, contact)
    deliver_mail(
      to:      @contact.email,
      subject: "Payment Received for invoice #{invoice.number}"
    )
  end

  private

  def set_up(invoice, contact = nil)
    @invoice  = invoice
    @client   = invoice.client
    @contact  = contact || invoice.contact
    @business = @client.business_profile

    attachments["#{@invoice.number}.pdf"] = {
      mime_type: "application/pdf",
      content: @invoice.pdf.download
    }

    if @business.logo.attached?
      attachments.inline["logo"] = {
        data:      @business.logo.download,
        mime_type: @business.logo.content_type
      }
    end
  end
end
