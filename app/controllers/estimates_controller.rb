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

    estimate = EstimateGenerator.new(project: project).generate!

    if estimate.nil?
      render json: { error: "No tasks with estimated hours found for this project." },
             status: :unprocessable_entity
      return
    end

    pdf_data = EstimatePdfGenerator.new(estimate).generate
    estimate.pdf.attach(
      io: StringIO.new(pdf_data),
      filename: "#{estimate.number}.pdf",
      content_type: "application/pdf"
    )

    render json: estimate_json(estimate), status: :created
  end

  def update
    if @estimate.update(estimate_params)
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
    unless @estimate.project.client.email1.present?
      render json: { error: "Client has no email address on file." }, status: :unprocessable_entity
      return
    end

    unless @estimate.pdf.attached?
      render json: { error: "No PDF found. Please regenerate the PDF first." }, status: :unprocessable_entity
      return
    end

    changes = diff_since_last_sent(@estimate)
    EstimateMailer.estimate_email(@estimate, changes).deliver_now

    snapshot_items = @estimate.estimate_line_items.includes(task: :time_entries)
    @estimate.update!(
      last_sent_snapshot: snapshot_items.map { |i|
        {
          "task_id"      => i.task_id,
          "description"  => i.description,
          "hours"        => i.hours.to_f,
          "amount"       => i.amount.to_f,
          "status"       => i.task&.status,
          "actual_hours" => i.task&.actual_hours.to_f
        }
      },
      last_sent_total: snapshot_items.sum { |i| i.task&.status == "done" ? i.task.actual_hours.to_f * i.rate : i.amount } +
                       snapshot_items.sum { |i| (i.task&.status == "done" ? i.task.actual_hours.to_f * i.rate : i.amount) * i.tax_rate / 100 }
    )

    render json: { message: "Estimate sent to #{@estimate.project.client.email1}." }
  end

  def regenerate_pdf
    pdf_data = EstimatePdfGenerator.new(@estimate).generate
    @estimate.pdf.attach(
      io: StringIO.new(pdf_data),
      filename: "#{@estimate.number}.pdf",
      content_type: "application/pdf"
    )
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
    @estimate = current_business_profile.estimates.includes(estimate_line_items: { task: :time_entries }).find(params[:id])
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

    prev_by_task = snapshot.index_by { |i| i["task_id"] }
    curr_items   = estimate.estimate_line_items.includes(task: :time_entries).map { |i|
      {
        "task_id"      => i.task_id,
        "description"  => i.description,
        "hours"        => i.hours.to_f,
        "amount"       => i.amount.to_f,
        "completed"    => i.task&.status == "done",
        "actual_hours" => i.task&.actual_hours&.to_f
      }
    }
    curr_by_task = curr_items.index_by { |i| i["task_id"] }

    added     = curr_items.reject { |i| prev_by_task[i["task_id"]] }
    removed   = snapshot.reject { |i| curr_by_task[i["task_id"]] }
    changed   = curr_items.filter_map do |i|
      prev = prev_by_task[i["task_id"]]
      next unless prev && prev["hours"] != i["hours"]
      { "description" => i["description"], "old_hours" => prev["hours"], "new_hours" => i["hours"] }
    end
    completed = curr_items.filter_map do |i|
      prev = prev_by_task[i["task_id"]]
      next unless i["completed"]
      prev_actual = prev&.dig("actual_hours").to_f
      next if i["actual_hours"].to_f == prev_actual
      { "description" => i["description"], "estimated_hours" => i["hours"], "actual_hours" => i["actual_hours"].to_f }
    end

    return nil if added.empty? && removed.empty? && changed.empty? && completed.empty?

    line_items      = estimate.estimate_line_items.includes(task: :time_entries)
    item_amount     = ->(i) { i.task&.status == "done" ? i.task.actual_hours.to_f * i.rate : i.amount }
    effective_total = line_items.sum { |i| item_amount.call(i) } +
                      line_items.sum { |i| item_amount.call(i) * i.tax_rate / 100 }

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
    params.require(:estimate).permit(:status)
  end

  def estimate_json(estimate)
    estimate.as_json(
      except: %i[last_sent_snapshot last_sent_total],
      methods: :number,
      include: {
        project: {
          only: %i[id name],
          include: { client: {} }
        },
        estimate_line_items: {
          include: { task: { only: %i[id title status], methods: %i[actual_hours] } }
        }
      }
    )
  end
end
