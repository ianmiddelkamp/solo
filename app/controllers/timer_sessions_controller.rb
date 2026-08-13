class TimerSessionsController < ApplicationController
  def current
    session = @current_user.timer_sessions.active.order(started_at: :desc).first
    if session
      render json: session_json(session)
    else
      render json: nil
    end
  end

  def start
    # Stop any existing active session first
    @current_user.timer_sessions.active.update_all(stopped_at: Time.current)

    project = current_business_profile.projects.find(params[:project_id])
    task = params[:task_id].present? ? Task.where(task_group_id: project.task_groups.select(:id)).find(params[:task_id]) : nil

    session = @current_user.timer_sessions.create!(
      project_id: project.id,
      task_id: task&.id,
      started_at: Time.current,
      description: params[:description]
    )

    # Mark task as in_progress when timer starts
    Task.where(id: task&.id).update_all(status: "in_progress") if task

    render json: session_json(session), status: :created
  end

  def stop
    session = @current_user.timer_sessions.active.order(started_at: :desc).first

    unless session
      render json: { error: "No active timer." }, status: :not_found
      return
    end

    project_id = session.project_id
    if params[:project_id].present?
      project_id = current_business_profile.projects.find(params[:project_id]).id
    end

    session.update!(
      stopped_at: Time.current,
      project_id: project_id,
      description: params[:description]
    )

    time_entry = @current_user.time_entries.create!(
      project_id: session.project_id,
      task_id: session.task_id,
      date: session.started_at.to_date,
      hours: session.hours,
      description: session.description,
      started_at: session.started_at,
      stopped_at: session.stopped_at
    )

    render json: { timer_session: session_json(session), time_entry: time_entry.as_json }
  end

  def update
    session = @current_user.timer_sessions.active.order(started_at: :desc).first
    unless session
      render json: { error: "No active timer." }, status: :not_found
      return
    end
    attrs = { description: params[:description] }
    if params.key?(:task_id)
      attrs[:task_id] = params[:task_id].presence
    end
    session.update!(attrs)
    render json: session_json(session)
  end

  def cancel
    @current_user.timer_sessions.active.update_all(stopped_at: Time.current)
    head :no_content
  end

  private

  def session_json(session)
    session.as_json(include: { project: { include: :client }, task: { only: %i[id title status] } })
  end
end
