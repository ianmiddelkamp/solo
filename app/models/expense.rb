class Expense < ApplicationRecord
  belongs_to :business_profile
  has_one_attached :receipt

  validates :date, :description, :amount, presence: true
  validates :amount, numericality: { greater_than_or_equal_to: 0 }
  validates :hst_paid, numericality: { greater_than_or_equal_to: 0 }

  scope :in_period, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :for_year, ->(year) { where(date: Date.new(year, 1, 1)..Date.new(year, 12, 31)) }

  CATEGORIES = %w[advertising meals office professional_fees rent software supplies travel vehicle other].freeze
end
