class EstimatesController < ApplicationController
  before_action :set_estimate, only: [:show, :update, :destroy, :pdf, :regenerate_pdf, :send_estimate]

  def index
    estimates = current_business_profile.estimates.includes(project: :client).order(created_at: :asc)
    estimates = estimates.where(project_id: params[:project_id]) if params[:project_id].present?
    render json: estimates.as_json(
      methods: :number,
      include: { project: { only: %i[id name], include: { client: { only: %i[id name] } } } }
    )
  end

  def show
    render json: estimate_json(@estimate).merge(changes: diff_since_last_sent(@estimate))
  end

  def create
    project = current_business_profile.projects.find(params[:project_id])
    contact = resolve_contact(project.client, params[:contact_id])

    estimate = EstimateGenerator.new(project: project, contact: contact).generate!

    if estimate.nil?
      render json: { error: "No tasks with estimated hours found for this project." },
             status: :unprocessable_entity
      return
    end

    regenerate_estimate_pdf!(estimate)

    render json: estimate_json(estimate), status: :created
  end

  def update
    attrs = estimate_params.to_h
    contact_changing = attrs.key?("contact_id") && attrs["contact_id"].to_i != @estimate.contact_id
    if attrs.key?("contact_id")
      contact = current_business_profile.contacts.find_by(id: attrs["contact_id"])
      unless contact && contact.client_id == @estimate.project.client_id
        render json: { errors: ["Contact must belong to this estimate's client."] }, status: :unprocessable_entity
        return
      end
    end

    if @estimate.update(estimate_params)
      # The "Prepared For" contact is shown as part of the document preview even though it's
      # only metadata on the record — regenerating here means what's displayed always matches
      # what's actually stored/attached, so there's never a stale PDF with the old contact's
      # info still printed on it after an edit.
      regenerate_estimate_pdf!(@estimate) if contact_changing && @estimate.pdf.attached?
      render json: estimate_json(@estimate)
    else
      render json: { errors: @estimate.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @estimate.destroy
    head :no_content
  end

  def send_estimate
    contact = if params[:contact_id].present?
      current_business_profile.contacts.find_by(id: params[:contact_id])
    else
      @estimate.contact
    end

    unless contact && contact.client_id == @estimate.project.client_id
      render json: { error: "Contact must belong to this estimate's client." }, status: :unprocessable_entity
      return
    end

    unless contact.email.present?
      render json: { error: "Contact has no email address on file." }, status: :unprocessable_entity
      return
    end

    unless @estimate.pdf.attached?
      render json: { error: "No PDF found. Please regenerate the PDF first." }, status: :unprocessable_entity
      return
    end

    changes = diff_since_last_sent(@estimate)
    EstimateMailer.estimate_email(@estimate, changes, contact).deliver_now

    snapshot_items = @estimate.estimate_line_items.includes(task: :time_entries)
    @estimate.update!(
      last_sent_snapshot: snapshot_items.map { |i|
        {
          "task_id"         => i.task_id,
          "disbursement_id" => i.disbursement_id,
          "description"     => i.description,
          "hours"           => i.hours.to_f,
          "amount"          => i.amount.to_f,
          "status"          => i.task&.status,
          "actual_hours"    => i.task&.actual_hours.to_f
        }
      },
      last_sent_total: snapshot_items.sum(&:display_amount) +
                       snapshot_items.sum { |i| i.display_amount * i.tax_rate / 100 }
    )

    render json: { message: "Estimate sent to #{contact.email}." }
  end

  def regenerate_pdf
    regenerate_estimate_pdf!(@estimate)
    render json: { message: "PDF regenerated successfully" }
  end

  def pdf
    unless @estimate.pdf.attached?
      render json: { error: "PDF not available" }, status: :not_found
      return
    end

    send_data @estimate.pdf.download,
      filename: "#{@estimate.number}.pdf",
      type: "application/pdf",
      disposition: "attachment"
  end

  private

  def set_estimate
    @estimate = current_business_profile.estimates
      .includes(estimate_line_items: [{ task: [:time_entries, :task_group] }, :disbursement], contact: [])
      .find(params[:id])
  end

  def regenerate_estimate_pdf!(estimate)
    pdf_data = EstimatePdfGenerator.new(estimate).generate
    estimate.pdf.attach(
      io: StringIO.new(pdf_data),
      filename: "#{estimate.number}.pdf",
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

  def diff_since_last_sent(estimate)
    snapshot = estimate.last_sent_snapshot
    previous_total = estimate.last_sent_total

    if snapshot.nil?
      prev = current_business_profile.estimates
        .where(project_id: estimate.project_id)
        .where.not(id: estimate.id)
        .where.not(last_sent_snapshot: nil)
        .order(updated_at: :desc)
        .first
      snapshot       = prev&.last_sent_snapshot
      previous_total = prev&.last_sent_total
    end

    return nil unless snapshot.present?

    # Every line item has either a task_id or a disbursement_id, never both — task_id alone
    # can't key this index because every disbursement row shares the same nil task_id and would
    # collide under it. Fall back to a disambiguated disbursement key when there's no task.
    item_key = ->(i) { i["task_id"] || "disbursement-#{i["disbursement_id"]}" }

    prev_by_key = snapshot.index_by { |i| item_key.call(i) }
    curr_items  = estimate.estimate_line_items.includes(task: :time_entries).map { |i|
      {
        "task_id"         => i.task_id,
        "disbursement_id" => i.disbursement_id,
        "description"     => i.description,
        "hours"           => i.hours.to_f,
        "amount"          => i.amount.to_f,
        "completed"       => i.task&.status == "done",
        "actual_hours"    => i.task&.actual_hours&.to_f
      }
    }
    curr_by_key = curr_items.index_by { |i| item_key.call(i) }

    added     = curr_items.reject { |i| prev_by_key[item_key.call(i)] }
    removed   = snapshot.reject { |i| curr_by_key[item_key.call(i)] }
    changed   = curr_items.filter_map do |i|
      prev = prev_by_key[item_key.call(i)]
      next unless prev && prev["hours"] != i["hours"]
      { "description" => i["description"], "old_hours" => prev["hours"], "new_hours" => i["hours"] }
    end
    completed = curr_items.filter_map do |i|
      prev = prev_by_key[item_key.call(i)]
      next unless i["completed"]
      prev_actual = prev&.dig("actual_hours").to_f
      next if i["actual_hours"].to_f == prev_actual
      { "description" => i["description"], "estimated_hours" => i["hours"], "actual_hours" => i["actual_hours"].to_f }
    end

    return nil if added.empty? && removed.empty? && changed.empty? && completed.empty?

    line_items      = estimate.estimate_line_items.includes(task: :time_entries)
    effective_total = line_items.sum(&:display_amount) +
                      line_items.sum { |i| i.display_amount * i.tax_rate / 100 }

    {
      added: added,
      removed: removed,
      changed: changed,
      completed: completed,
      previous_total: previous_total,
      current_total: effective_total.round(2)
    }
  end

  def estimate_params
    params.require(:estimate).permit(:status, :contact_id)
  end

  def estimate_json(estimate)
    estimate.as_json(
      except: %i[last_sent_snapshot last_sent_total],
      methods: :number,
      include: {
        project: {
          only: %i[id name billing_mode billing_amount show_task_breakdown show_hours show_actual_hours],
          include: { client: { include: { contacts: { only: %i[id name email phone phone2 primary] } } } }
        },
        contact: { only: %i[id name email phone phone2 primary] },
        estimate_line_items: {
          include: {
            task: {
              only: %i[id title status], methods: %i[actual_hours],
              include: { task_group: { only: %i[id title position] } }
            },
            disbursement: { only: %i[id description] }
          }
        }
      }
    )
  end
end
