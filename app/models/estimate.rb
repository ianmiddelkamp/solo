class Estimate < ApplicationRecord
  belongs_to :project
  has_one :client, through: :project
  has_many :estimate_line_items, dependent: :destroy

  has_one_attached :pdf

  STATUSES = %w[draft sent accepted declined].freeze
  validates :status, inclusion: { in: STATUSES }

  before_create :assign_sequence_number

  def number
    "EST-#{sequence_number.to_s.rjust(4, "0")}"
  end

  private

  # Self-healing: never trust the stored counter alone, always also check the highest
  # sequence_number already issued for this business. Protects against a stale counter
  # (e.g. after manual data cleanup) without ever colliding with or reusing a number.
  def assign_sequence_number
    business_profile = project.client.business_profile
    next_number = [
      business_profile.next_estimate_number,
      business_profile.estimates.maximum(:sequence_number).to_i + 1
    ].max

    self.sequence_number = next_number
    business_profile.update!(next_estimate_number: next_number + 1)
  end
end
