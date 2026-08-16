class ProjectDisbursementsController < ApplicationController
  before_action :set_project
  before_action :set_disbursement, only: [:update, :destroy]

  def index
    render json: @project.disbursements.order(created_at: :asc)
  end

  def create
    disbursement = @project.disbursements.build(disbursement_params)
    if disbursement.save
      render json: disbursement, status: :created
    else
      render json: { errors: disbursement.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @disbursement.update(disbursement_params)
      render json: @disbursement
    else
      render json: { errors: @disbursement.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @disbursement.destroy
    head :no_content
  end

  private

  def set_project
    @project = current_business_profile.projects.find(params[:project_id])
  end

  def set_disbursement
    @disbursement = @project.disbursements.find(params[:id])
  end

  def disbursement_params
    params.require(:disbursement).permit(:description, :amount, :incurred_on, :paid)
  end
end
