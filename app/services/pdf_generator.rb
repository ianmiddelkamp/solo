class PdfGenerator
  include PdfRenderer

  def initialize(invoice)
    @invoice  = invoice
    @client   = invoice.client
    @contact  = invoice.contact
    @business = @client.business_profile
    @items    = invoice.invoice_line_items
                       .includes(time_entry: [:project, :charge_code, :task])
                       .order("time_entries.date ASC")
  end

  def generate
    html = ActionController::Base.render(
      template: "pdfs/invoice",
      layout: "pdf",
      assigns: {
        invoice: @invoice,
        client: @client,
        contact: @contact,
        business: @business,
        items: @items,
        logo_data_uri: @business.logo_data_uri
      }
    )
    render_to_pdf(html)
  end
end
