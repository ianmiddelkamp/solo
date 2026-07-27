class User < ApplicationRecord
  has_secure_password

  has_many :time_entries
  has_many :rates
  has_one :business_profile

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
end