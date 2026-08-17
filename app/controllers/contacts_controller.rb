class ContactsController < ApplicationController
  before_action :set_client
  before_action :set_contact, only: [:update, :destroy]

  def index
    render json: @client.contacts.includes(:roles).order(primary: :desc, name: :asc).map { |c| contact_json(c) }
  end

  def create
    contact = @client.contacts.build(contact_params)
    contact.roles = resolve_roles if role_names.present?

    if contact.save
      render json: contact_json(contact), status: :created
    else
      render json: { errors: contact.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @contact.roles = resolve_roles if role_names.present?

    if @contact.update(contact_params)
      render json: contact_json(@contact)
    else
      render json: { errors: @contact.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    if @client.contacts.count <= 1
      render json: { error: "A client must have at least one contact." }, status: :unprocessable_entity
      return
    end
    if @contact.primary?
      render json: { error: "Can't delete the primary contact — make another contact primary first." },
             status: :unprocessable_entity
      return
    end

    @contact.destroy
    head :no_content
  end

  private

  def set_client
    @client = current_business_profile.clients.find(params[:client_id])
  end

  def set_contact
    @contact = @client.contacts.find(params[:id])
  end

  def contact_params
    params.require(:contact).permit(:name, :email, :phone, :phone2, :primary)
  end

  # Roles are freeform tags scoped to the client — sent as plain name strings, not IDs, so the
  # frontend never has to manage role IDs directly. Each name is find_or_create_by'd against this
  # client's own role namespace (two different clients can each have their own "Billing" role,
  # they're never shared), then the contact's role set is replaced wholesale with the resolved
  # list — this is a full sync (add + remove), not an additive-only append.
  def role_names
    params.dig(:contact, :role_names)
  end

  def resolve_roles
    role_names.map { |name| @client.roles.find_or_create_by!(name: name.strip) }
  end

  def contact_json(contact)
    contact.as_json(
      only: %i[id client_id name email phone phone2 primary],
      include: { roles: { only: %i[id name] } }
    )
  end
end
