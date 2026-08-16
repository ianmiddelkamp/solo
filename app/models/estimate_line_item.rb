class EstimateLineItem < ApplicationRecord
  belongs_to :estimate
  belongs_to :task, optional: true
  belongs_to :disbursement, optional: true

  validates :hours, :rate, :amount, presence: true
end
