class InvoicesController < ApplicationController
  before_action :set_invoice, only: [:show, :update, :destroy, :pdf, :regenerate_pdf, :send_invoice, :mark_as_paid, :send_receipt]

  def index
    invoices = current_business_profile.invoices.includes(:client).order(created_at: :desc)
    render json: invoices.as_json(include: :client, methods: [:number, :outstanding])
  end

  # GET /invoices/export?format=csv|xlsx|md
  def export
    invoices = current_business_profile.invoices.includes(:client).order(created_at: :desc)
    headers = ["Invoice #", "Client", "Period", "Total", "Status", "Outstanding", "Payment Date"]
    rows = invoices.map do |inv|
      period = if inv.start_date && inv.end_date
        "#{inv.start_date} - #{inv.end_date}"
      else
        inv.start_date.to_s
      end
      [inv.number, inv.client&.name, period, inv.total, inv.status, inv.outstanding, inv.paid_at&.to_date&.to_s]
    end

    case params[:format]
    when "csv"
      send_data TableExport.csv(headers, rows), filename: "invoices.csv", type: "text/csv"
    when "xlsx"
      send_data TableExport.xlsx("Invoices", headers, rows), filename: "invoices.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    when "md"
      send_data TableExport.markdown("Invoices", headers, rows), filename: "invoices.md", type: "text/markdown"
    else
      render json: { error: "Unsupported format" }, status: :unprocessable_entity
    end
  end

  def show
    render json: invoice_json(@invoice)
  end

  def unbilled_entries
    client = current_business_profile.clients.find(params[:client_id])

    scope = TimeEntry
      .left_outer_joins(:invoice_line_item, :project)
      .where(invoice_line_items: { id: nil })
      .where(
        "(time_entries.project_id IS NOT NULL AND projects.client_id = :cid) OR " \
        "(time_entries.charge_code_id IS NOT NULL AND time_entries.client_id = :cid)",
        cid: client.id
      )
      .includes(:task, :charge_code, project: {})

    scope = scope.where("time_entries.date >= ?", params[:start_date]) if params[:start_date].present?
    scope = scope.where("time_entries.date <= ?", params[:end_date]) if params[:end_date].present?

    render json: scope.order("time_entries.date desc").as_json(
      include: {
        task: { only: %i[id title] },
        project: { only: %i[id name] },
        charge_code: { only: %i[id code description] }
      }
    )
  end

  def create
    client = current_business_profile.clients.find(params[:client_id])
    contact = resolve_contact(client, params[:contact_id])

    begin
      invoice = InvoiceGenerator.new(
        client: client,
        contact: contact,
        start_date: params[:start_date],
        end_date: params[:end_date],
        time_entry_ids: params[:time_entry_ids]
      ).generate!
    rescue ArgumentError => e
      render json: { error: e.message }, status: :unprocessable_entity
      return
    end

    if invoice.nil?
      render json: { error: "No unbilled time entries found for this client in the selected period." },
             status: :unprocessable_entity
      return
    end

    regenerate_invoice_pdf!(invoice)

    render json: invoice_json(invoice), status: :created
  end

  def update
    attrs = invoice_params.to_h
    contact_changing = attrs.key?("contact_id") && attrs["contact_id"].to_i != @invoice.contact_id
    if attrs.key?("contact_id")
      contact = current_business_profile.contacts.find_by(id: attrs["contact_id"])
      unless contact && contact.client_id == @invoice.client_id
        render json: { errors: ["Contact must belong to this invoice's client."] }, status: :unprocessable_entity
        return
      end
    end

    if @invoice.update(invoice_params)
      # The "Bill To" contact is shown as part of the document preview even though it's only
      # metadata on the record — regenerating here means what's displayed always matches what's
      # actually stored/attached, so there's never a stale PDF with the old contact's info still
      # printed on it after an edit.
      regenerate_invoice_pdf!(@invoice) if contact_changing && @invoice.pdf.attached?
      render json: invoice_json(@invoice)
    else
      render json: { errors: @invoice.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    if @invoice.status == "paid"
      render json: { error: "Paid invoices cannot be deleted." }, status: :unprocessable_entity
      return
    end

    @invoice.destroy
    head :no_content
  end

  def send_invoice
    contact = resolve_send_contact(@invoice)
    return unless contact

    unless @invoice.pdf.attached?
      render json: { error: "No PDF found. Please regenerate the PDF first." }, status: :unprocessable_entity
      return
    end

    InvoiceMailer.invoice_email(@invoice, contact).deliver_now
    render json: { message: "Invoice sent to #{contact.email}." }
  end

  def send_receipt
    contact = resolve_send_contact(@invoice)
    return unless contact

    unless @invoice.pdf.attached?
      render json: { error: "No PDF found. Please regenerate the PDF first." }, status: :unprocessable_entity
      return
    end

    InvoiceMailer.receipt_email(@invoice, contact).deliver_now
    render json: { message: "Receipt sent to #{contact.email}." }
  end
  def regenerate_pdf
    regenerate_invoice_pdf!(@invoice)
    render json: { message: "PDF regenerated successfully" }
  end

  def pdf
    unless @invoice.pdf.attached?
      render json: { error: "PDF not available" }, status: :not_found
      return
    end

    send_data @invoice.pdf.download,
      filename: "#{@invoice.number}.pdf",
      type: "application/pdf",
      disposition: "attachment"
  end

  def mark_as_paid
    unless @invoice.paid_at.nil?
      render json: { error: "Invoice already paid" }, status: :method_not_allowed
      return
    end


    if @invoice.update({ status: "paid", paid_at: Time.current }.merge(paid_params))
      render json: invoice_json(@invoice)
    else
      render json: { errors: @invoice.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_invoice
    @invoice = current_business_profile.invoices.includes(:contact).find(params[:id])
  end

  def regenerate_invoice_pdf!(invoice)
    pdf_data = PdfGenerator.new(invoice).generate
    invoice.pdf.attach(
      io: StringIO.new(pdf_data),
      filename: "#{invoice.number}.pdf",
      content_type: "application/pdf"
    )
  end

  # Defaults to the client's primary contact when none is given; raises RecordNotFound (rendered
  # as a 404 by ApplicationController, matching every other tenant-scoped .find in this app) if a
  # contact_id is given but doesn't belong to this client.
  def resolve_contact(client, contact_id)
    return client.primary_contact if contact_id.blank?
    current_business_profile.contacts.where(client: client).find(contact_id)
  end

  # Shared by send_invoice/send_receipt: resolves an optional per-send contact_id override,
  # falling back to the invoice's stored contact, and renders the appropriate error (returning
  # nil) if the resolved contact is invalid or has no email — callers check the return value.
  def resolve_send_contact(invoice)
    contact = if params[:contact_id].present?
      current_business_profile.contacts.find_by(id: params[:contact_id])
    else
      invoice.contact
    end

    unless contact && contact.client_id == invoice.client_id
      render json: { error: "Contact must belong to this invoice's client." }, status: :unprocessable_entity
      return nil
    end

    unless contact.email.present?
      render json: { error: "Contact has no email address on file." }, status: :unprocessable_entity
      return nil
    end

    contact
  end

  def invoice_params
    params.require(:invoice).permit(:status, :contact_id)
  end

  def invoice_json(invoice)
    invoice.as_json(
      methods: :number,
      include: {
        client: { include: { contacts: { only: %i[id name email phone phone2 primary] } } },
        contact: { only: %i[id name email phone phone2 primary] },
        invoice_line_items: {
          include: { time_entry: { include: [:project, :charge_code] } }
        }
      }
    )
  end

   def paid_params
    params.require(:payment).permit(:paid_at, :amount_paid)
  end
end
