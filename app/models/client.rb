class Client < ApplicationRecord
  belongs_to :business_profile
  has_many :projects
  has_many :invoices
  has_many :rates
  has_many :contacts, dependent: :destroy
  has_many :roles, dependent: :destroy

  validates :name, presence: true

  def current_rate
    rates.first&.rate
  end

  def primary_contact
    contacts.find_by(primary: true)
  end
end