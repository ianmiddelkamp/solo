class Contact < ApplicationRecord
  belongs_to :client
  has_many :contact_roles, dependent: :destroy
  has_many :roles, through: :contact_roles

  validates :name, presence: true

  before_save :unset_other_primaries, if: -> { primary? && primary_changed? }

  private

  # Exactly one primary contact per client, always — this is the model-level half of the
  # guarantee (the partial unique index on contacts(client_id) WHERE primary is the DB-level
  # half). Runs in the same save, not a separate transaction, so there's never a moment with
  # two primaries or zero.
  def unset_other_primaries
    client.contacts.where.not(id: id).update_all(primary: false)
  end
end
