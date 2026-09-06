class PdfGenerator
  include PdfRenderer

  def initialize(invoice)
    @invoice  = invoice
    @client   = invoice.client
    @contact  = invoice.contact
    @business = @client.business_profile
    # Ordered by id (insertion order), not time_entry.date — fixed/adjustment lines have no
    # time_entry to sort by, and InvoiceGenerator already creates rows in the desired order.
    @items    = invoice.invoice_line_items
                       .includes(time_entry: [:project, :charge_code, :task], project: [], task: :task_group)
                       .order(:id)
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
