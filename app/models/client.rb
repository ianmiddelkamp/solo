class Client < ApplicationRecord
  belongs_to :business_profile
  has_many :projects
  has_many :invoices
  has_many :rates

  validates :name, presence: true

  def current_rate
    rates.first&.rate
  end
end