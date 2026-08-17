class Role < ApplicationRecord
  belongs_to :client
  has_many :contact_roles, dependent: :destroy
  has_many :contacts, through: :contact_roles

  validates :name, presence: true, uniqueness: { scope: :client_id }
end
