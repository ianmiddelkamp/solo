class InvoiceMailer < ApplicationMailer
  def invoice_email(invoice)
    set_up(invoice)

    mail(
      to:      @client.email1,
      subject: "Invoice #{invoice.number} from #{@business.name.presence || 'us'}"
    )
  end

  def receipt_email(invoice)
    set_up(invoice)
    mail(
      to:      @client.email1,
      subject: "Payment Received for invoice #{invoice.number}"
    )
  end

  private

  def set_up(invoice)
    @invoice  = invoice
    @client   = invoice.client
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
