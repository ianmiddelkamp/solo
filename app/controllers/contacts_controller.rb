class ContactsController < ApplicationController
  before_action :set_client
  before_action :set_contact, only: [:update, :archive]

  def index
    contacts = @client.contacts.includes(:roles).order(primary: :desc, name: :asc)
    contacts = contacts.where(is_archived: false) unless params[:show_archived].present?
    render json: contacts.map { |c| contact_json(c) }
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

  # PATCH /clients/:client_id/contacts/:id/archive
  # body: { contact: { is_archived: true|false } }
  #
  # Archiving replaced hard-deletion entirely: a Contact can be referenced by Invoices/Estimates
  # (contact_id, both NOT NULL with a DB foreign key), so destroying one that's ever been used on
  # a document raised a raw FK violation. Archiving has no such constraint — the contact and every
  # document that points to it stay intact, it just drops out of the active list and picker.
  def archive
    if archive_params[:is_archived] && @client.contacts.where(is_archived: false).count <= 1
      render json: { error: "A client must have at least one active contact." }, status: :unprocessable_entity
      return
    end
    if archive_params[:is_archived] && @contact.primary?
      render json: { error: "Can't archive the primary contact — make another contact primary first." },
             status: :unprocessable_entity
      return
    end

    if @contact.update(archive_params)
      render json: contact_json(@contact)
    else
      render json: { errors: @contact.errors.full_messages }, status: :unprocessable_entity
    end
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

  def archive_params
    params.require(:contact).permit(:is_archived)
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
      only: %i[id client_id name email phone phone2 primary is_archived],
      include: { roles: { only: %i[id name] } }
    )
  end
end
