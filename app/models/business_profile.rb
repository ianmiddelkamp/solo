class BusinessProfile < ApplicationRecord
  belongs_to :user, optional: true
  has_one_attached :logo

  encrypts :gmail_app_password

  has_many :clients, dependent: :destroy
  has_many :expenses, dependent: :destroy
  has_many :hst_returns, dependent: :destroy
  has_many :cca_assets, dependent: :destroy
  has_one :home_office_profile, dependent: :destroy

  has_many :projects, through: :clients
  has_many :invoices, through: :clients
  has_many :estimates, through: :projects
  has_many :task_groups, through: :projects
  has_many :contacts, through: :clients

  def self.for_user(user)
    find_or_create_by!(user: user)
  end

  def logo_data_uri
    return nil unless logo.attached?
    "data:#{logo.blob.content_type};base64,#{Base64.strict_encode64(logo.download)}"
  end

  def email_configured?
    gmail_user.present? && gmail_app_password.present?
  end

  def smtp_settings
    {
      address:              "smtp.gmail.com",
      port:                 587,
      domain:               "gmail.com",
      user_name:            gmail_user,
      password:             gmail_app_password,
      authentication:       :plain,
      enable_starttls_auto: true,
      open_timeout:         10,
      read_timeout:         30
    }
  end
end
