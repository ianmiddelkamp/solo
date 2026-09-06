class Invoice < ApplicationRecord
  belongs_to :client
  belongs_to :contact
  has_many :invoice_line_items, dependent: :destroy
  has_many :time_entries, dependent: :nullify
  has_one_attached :pdf

  validates :status, inclusion: { in: %w[pending sent paid] }
  validates :amount_paid, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  before_create :assign_sequence_number

  def number
    "INV-#{sequence_number.to_s.rjust(4, '0')}"
  end

  def outstanding
    (total || 0) - (amount_paid || 0)
  end

  private

  # Self-healing: never trust the stored counter alone, always also check the highest
  # sequence_number already issued for this business. Protects against a stale counter
  # (e.g. after manual data cleanup) without ever colliding with or reusing a number.
  def assign_sequence_number
    business_profile = client.business_profile
    next_number = [
      business_profile.next_invoice_number,
      business_profile.invoices.maximum(:sequence_number).to_i + 1
    ].max

    self.sequence_number = next_number
    business_profile.update!(next_invoice_number: next_number + 1)
  end
end