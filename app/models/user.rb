class User < ApplicationRecord
  has_secure_password validations: false

  ROLES = %w[admin member].freeze

  has_many :time_entries
  has_many :rates
  has_many :charge_codes
  has_many :timer_sessions
  has_one :business_profile
  belongs_to :invited_by, class_name: "User", optional: true

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
  validates :role, inclusion: { in: ROLES }, allow_nil: true
  validates :password, presence: true, length: { minimum: 8 }, if: :password_required?

  before_validation :generate_invite_token, on: :create

  def admin?
    role == "admin"
  end

  def invited?
    accepted_at.blank?
  end

  def accept_invite!(name:, password:)
    update(
      name: name,
      password: password,
      accepted_at: Time.current,
      invite_token: nil
    )
  end

  private

  # Password is required for a normal signup and when accepting an invite,
  # but not when an admin first creates the invited (not-yet-accepted) user row,
  # and not on ordinary updates to an existing account that aren't touching the password.
  def password_required?
    return true if accepted_at_changed? && accepted_at.present?
    return false if invited_by_id.present? && accepted_at.blank?

    password.present? || password_digest.blank?
  end

  def generate_invite_token
    return if accepted_at.present? || password_digest.present?

    self.invite_token ||= SecureRandom.urlsafe_base64(32)
    self.invite_sent_at ||= Time.current
  end
end
