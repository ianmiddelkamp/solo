class ClientsController < ApplicationController
  before_action :set_client, only: [:show, :update, :destroy]

  def index
    bp = BusinessProfile.for_user(@current_user)
    render json: bp.clients.includes(:rates).order(:name).as_json(methods: :current_rate)
  end

  def show
    render json: @client.as_json(methods: :current_rate)
  end

  def create
    bp = BusinessProfile.for_user(@current_user)
    @client = bp.clients.new(client_params)
    if @client.save
      render json: @client.as_json(methods: :current_rate), status: :created
    else
      render json: { errors: @client.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @client.update(client_params)
      render json: @client.as_json(methods: :current_rate)
    else
      render json: { errors: @client.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @client.destroy
    head :no_content
  end

  private

  def set_client
    bp = BusinessProfile.for_user(@current_user)
    @client = bp.clients.find(params[:id])
  end

  def client_params
    params.require(:client).permit(
      :name, :contact_name,
      :email1, :email2,
      :phone1, :phone2,
      :address1, :address2, :city, :state, :postcode, :country,
      :sales_terms
    )
  end
end
