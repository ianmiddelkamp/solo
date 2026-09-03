class ClientsController < ApplicationController
  before_action :set_client, only: [:show, :update, :archive]

  def index
    bp = BusinessProfile.for_user(@current_user)
    clients = bp.clients.includes(:rates, :contacts).order(:name)
    clients = clients.where(is_archived: false) unless params[:show_archived].present?
    render json: clients.as_json(
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

  # Archiving a client also archives all of its projects — an archived client shouldn't leave
  # active-looking projects behind. Unarchiving the client does NOT cascade back to projects
  # (some may have been archived independently beforehand for other reasons), so that direction
  # stays a manual, per-project decision.
  def archive
    ActiveRecord::Base.transaction do
      @client.update!(archive_params)
      @client.projects.update_all(is_archived: true) if @client.is_archived
    end
    render json: client_json(@client)
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
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

  def archive_params
    params.require(:client).permit(:is_archived)
  end

  def client_json(client)
    client.as_json(
      methods: %i[current_rate primary_contact],
      include: { contacts: { only: %i[id name email phone phone2 primary] } }
    )
  end
end
