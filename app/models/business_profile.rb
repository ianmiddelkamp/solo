class BusinessProfile < ApplicationRecord
  belongs_to :user, optional: true
  has_one_attached :logo

  has_many :clients, dependent: :destroy
  has_many :expenses, dependent: :destroy
  has_many :hst_returns, dependent: :destroy
  has_many :cca_assets, dependent: :destroy
  has_one :home_office_profile, dependent: :destroy

  has_many :projects, through: :clients
  has_many :invoices, through: :clients
  has_many :estimates, through: :projects
  has_many :task_groups, through: :projects

  def self.for_user(user)
    find_or_create_by!(user: user)
  end

  def logo_data_uri
    return nil unless logo.attached?
    "data:#{logo.blob.content_type};base64,#{Base64.strict_encode64(logo.download)}"
  end
end
