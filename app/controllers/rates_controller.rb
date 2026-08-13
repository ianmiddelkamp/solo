class RatesController < ApplicationController
  before_action :set_owner

  def show
    rate = @owner.rates.first
    render json: rate ? rate : { rate: nil }
  end

  def update
    rate = @owner.rates.first_or_initialize
    if rate.update(rate_params)
      render json: rate
    else
      render json: { errors: rate.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_owner
    if params[:project_id]
      @owner = current_business_profile.projects.find(params[:project_id])
    else
      @owner = current_business_profile.clients.find(params[:client_id])
    end
  end

  def rate_params
    params.require(:rate).permit(:rate)
  end
end
