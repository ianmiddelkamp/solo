class TaskGroupsController < ApplicationController
  before_action :set_project
  before_action :set_task_group, only: %i[update destroy]

  def index
    groups = @project.task_groups.includes(tasks: :time_entries)
    render json: groups.as_json(include: { tasks: { only: %i[id title status position estimated_hours],
                                                    methods: %i[actual_hours last_entry_date] } },
                                only: %i[id title position], methods: %i[estimated_hours_total actual_hours_total])
  end

  def create
    group = @project.task_groups.build(task_group_params)
    if group.save
      render json: group.as_json(include: { tasks: { only: %i[id title status position estimated_hours],
                                                    methods: %i[actual_hours last_entry_date] } },
                                 only: %i[id title position], methods: %i[estimated_hours_total actual_hours_total]), status: :created
    else
      render json: { errors: group.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @task_group.update(task_group_params)
      render json: @task_group.as_json(include: { tasks: { only: %i[id title status position estimated_hours],
                                                          methods: %i[actual_hours last_entry_date] } },
                                       only: %i[id title position], methods: %i[estimated_hours_total actual_hours_total])
    else
      render json: { errors: @task_group.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @task_group.destroy
    head :no_content
  end

  # GET /projects/:project_id/task_groups/export?format=docx|md
  def export
    groups = @project.task_groups.includes(tasks: :time_entries).order(:position)
    markdown = task_groups_markdown(groups)

    case params[:format]
    when "docx"
      send_data MarkdownToDocx.convert(markdown), filename: "task-groups.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    when "md"
      send_data markdown, filename: "task-groups.md", type: "text/markdown"
    else
      render json: { error: "Unsupported format" }, status: :unprocessable_entity
    end
  end

  # PATCH /projects/:project_id/task_groups/reorder
  # body: { ids: [1, 2, 3] }
  def reorder
    ids = params[:ids] || []
    ids.each_with_index do |id, idx|
      @project.task_groups.where(id: id).update_all(position: idx + 1)
    end
    head :no_content
  end

  private

  def set_project
    @project = current_business_profile.projects.find(params[:project_id])
  end

  def set_task_group
    @task_group = @project.task_groups.find(params[:id])
  end

  def task_group_params
    params.require(:task_group).permit(:title, :position)
  end

  def format_hours(value)
    value = value.to_f
    value % 1 == 0 ? "#{value.to_i}h" : "#{format('%.2f', value)}h"
  end

  STATUS_LABEL = { "todo" => "To do", "in_progress" => "In progress", "done" => "Done" }.freeze

  def status_label(status)
    STATUS_LABEL[status] || status
  end

  def task_groups_markdown(groups)
    sections = groups.map do |group|
      rows = group.tasks.map do |t|
        "| #{t.title} | #{status_label(t.status)} | " \
        "#{t.estimated_hours ? format_hours(t.estimated_hours) : '—'} | " \
        "#{t.actual_hours.positive? ? format_hours(t.actual_hours) : '—'} |"
      end.join("\n")
      rows = "| No tasks | | | |" if rows.blank?

      [
        "## #{group.title} (est. #{format_hours(group.estimated_hours_total)}, " \
        "actual #{format_hours(group.actual_hours_total)})",
        "",
        "| Task | Status | Estimate | Actual |",
        "| --- | --- | --- | --- |",
        rows
      ].join("\n")
    end.join("\n\n")

    "# Task Groups\n\n#{sections}"
  end
end
