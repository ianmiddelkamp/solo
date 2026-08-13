class TimeEntriesController < ApplicationController
  before_action :set_project, if: -> { params[:project_id].present? }
  before_action :set_time_entry, only: [:show, :update, :destroy]

  def index
    entries = if @project
      @project.time_entries
    else
      scope = @current_user.time_entries

      if params[:client_id].present?
        scope = scope.left_outer_joins(:project).where(
          "(time_entries.project_id IS NOT NULL AND projects.client_id = :cid) OR " \
          "(time_entries.charge_code_id IS NOT NULL AND time_entries.client_id = :cid)",
          cid: params[:client_id]
        )
      end

      scope = scope.where(project_id: params[:project_id]) if params[:project_id].present?
      scope = scope.where(project_id: nil) if params[:hide_charge_codes].blank? && params[:charge_code_id].present?
      scope = scope.where.not(project_id: nil) if params[:hide_charge_codes] == "true"

      if params[:status] == "unbilled"
        scope = scope.left_outer_joins(:invoice_line_item).where(invoice_line_items: { id: nil })
      elsif params[:status] == "billed"
        scope = scope.joins(:invoice_line_item)
      end

      scope
    end

    render json: entries
      .includes(:task, :charge_code, :client, invoice_line_item: :invoice, project: :client)
      .order(date: :desc)
      .as_json(
        include: {
          task: { only: %i[id title] },
          project: { only: %i[id name client_id], include: { client: { only: %i[id name] } } },
          charge_code: { only: %i[id code description] },
          client: { only: %i[id name] },
          invoice_line_item: { include: { invoice: { methods: :number } } }
        }
      )
  end

  def show
    render json: @time_entry.as_json(
      include: {
        task: { only: %i[id title] },
        project: { only: %i[id name] },
        charge_code: { only: %i[id code description] }
      }
    )
  end

  def create
    @time_entry = if @project
      @project.time_entries.new(time_entry_params.merge(user: @current_user))
    else
      @current_user.time_entries.new(time_entry_params)
    end

    if @time_entry.save
      render json: @time_entry, status: :created
    else
      render json: { errors: @time_entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @time_entry.update(time_entry_params)
      render json: @time_entry
    else
      render json: { errors: @time_entry.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @time_entry.destroy
    head :no_content
  end

  private

  def set_project
    @project = current_business_profile.projects.find(params[:project_id])
  end

  def set_time_entry
    @time_entry = @project ? @project.time_entries.find(params[:id]) : @current_user.time_entries.find(params[:id])
  end

  def time_entry_params
    params.require(:time_entry).permit(
      :date, :hours, :description,
      :started_at, :stopped_at,
      :task_id, :project_id, :charge_code_id, :client_id
    )
  end
end
