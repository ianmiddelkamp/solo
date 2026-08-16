class Disbursement < ApplicationRecord
  belongs_to :project
  has_many :estimate_line_items, dependent: :nullify

  validates :description, presence: true
  validates :amount, presence: true, numericality: { greater_than: 0 }
end
