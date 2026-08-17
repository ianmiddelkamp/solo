class ClientsController < ApplicationController
  before_action :set_client, only: [:show, :update, :destroy]

  def index
    bp = BusinessProfile.for_user(@current_user)
    render json: bp.clients.includes(:rates, :contacts).order(:name).as_json(
      methods: %i[current_rate primary_contact],
      include: { contacts: { only: %i[id name email phone phone2 primary] } }
    )
  end

  def show
    render json: client_json(@client)
  end

  # Creates the client and its required primary contact together, in one transaction — a client
  # can't exist without at least one (primary) contact, so this isn't a two-step flow.
  def create
    bp = BusinessProfile.for_user(@current_user)
    @client = bp.clients.new(client_params)

    ActiveRecord::Base.transaction do
      @client.save!
      @client.contacts.create!(contact_params.merge(primary: true))
    end

    render json: client_json(@client), status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  def update
    if @client.update(client_params)
      render json: client_json(@client)
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
      :name,
      :address1, :address2, :city, :state, :postcode, :country,
      :sales_terms
    )
  end

  def contact_params
    params.fetch(:contact, {}).permit(:name, :email, :phone, :phone2)
  end

  def client_json(client)
    client.as_json(
      methods: %i[current_rate primary_contact],
      include: { contacts: { only: %i[id name email phone phone2 primary] } }
    )
  end
end
