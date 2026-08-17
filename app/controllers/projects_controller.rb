class ProjectsController < ApplicationController
  before_action :set_project, only: [:show, :update, :destroy, :archive]

  def index
    projects = current_business_profile.projects.includes(client: :contacts, rates: []).order(:name)
    projects = projects.where(is_archived: false) unless params[:show_archived].present?
    render json: projects.as_json(
      include: { client: { include: { contacts: { only: %i[id name email phone phone2 primary] } } } },
      methods: :current_rate
    )
  end

  def show
    render json: @project.as_json(
      include: { client: { include: { contacts: { only: %i[id name email phone phone2 primary] } } } }
    )
  end

  def create
    client = current_business_profile.clients.find(project_params[:client_id])
    @project = client.projects.build(project_params.except(:client_id))
    if @project.save
      render json: @project.as_json(include: :client), status: :created
    else
      render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @project.update(project_params)
      render json: @project.as_json(include: :client)
    else
      render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def archive
    if @project.update(archive_params)
      render json: { success: true }
    else
      render json: { errors: @project.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @project.destroy
    head :no_content
  end

  private

  def set_project
    @project = current_business_profile.projects.find(params[:id])
  end

  def project_params
    params.require(:project).permit(:name, :client_id, :description)
  end

  def archive_params
    params.require(:project).permit(:is_archived)
  end
end
