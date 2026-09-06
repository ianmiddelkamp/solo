class InvoiceLineItem < ApplicationRecord
  KINDS = %w[time fixed adjustment].freeze

  belongs_to :invoice
  belongs_to :time_entry, optional: true
  belongs_to :project, optional: true
  belongs_to :task, optional: true

  before_validation :set_amount

  validates :hours, :rate, :amount, presence: true
  validates :kind, inclusion: { in: KINDS }

  # InvoiceGenerator stamps `task` directly on every "time" kind line as of the migration that
  # added this column — falls back to the time entry's task for any line created before then, so
  # older invoices still group correctly instead of losing their group affiliation entirely.
  def effective_task
    task || time_entry&.task
  end

  private

  # Only defaults from the time entry when one is present — Fixed Price/Capped "fixed" and
  # "adjustment" lines set hours/rate/amount explicitly and have no time_entry, so this must not
  # clobber an explicitly-set amount (was `=`, now `||=`).
  def set_amount
    self.hours  ||= time_entry&.hours || 0
    self.rate   ||= time_entry&.project&.rates&.first&.rate || 0
    self.amount ||= hours * rate
  end
end