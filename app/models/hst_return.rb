class HstReturn < ApplicationRecord
  belongs_to :business_profile

  validates :period_start, :period_end, presence: true
  validates :status, inclusion: { in: %w[draft filed paid] }

  before_save :compute_net_tax

  STATUSES = %w[draft filed paid].freeze

  def self.calculate_for_period(period_start, period_end, business_profile)
    start_date = period_start.is_a?(Date) ? period_start : Date.parse(period_start.to_s)
    end_date   = period_end.is_a?(Date) ? period_end : Date.parse(period_end.to_s)

    invoices   = Invoice.joins(:client).where(clients: { business_profile_id: business_profile.id }, end_date: start_date..end_date)
    line_items = InvoiceLineItem.where(invoice: invoices)

    total_revenue     = line_items.sum(:amount)
    hst_collected     = line_items.sum("amount * tax_rate / 100")
    input_tax_credits = business_profile.expenses.in_period(start_date, end_date).sum(:hst_paid)

    {
      total_revenue: total_revenue,
      hst_collected: hst_collected,
      input_tax_credits: input_tax_credits,
      net_tax: hst_collected - input_tax_credits,
      invoice_count: invoices.count
    }
  end

  private

  def compute_net_tax
    self.net_tax = (hst_collected || 0) - (input_tax_credits || 0)
  end
end
