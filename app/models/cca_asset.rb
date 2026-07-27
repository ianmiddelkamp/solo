class CcaAsset < ApplicationRecord
  belongs_to :business_profile

  validates :name, :cca_class, :cca_rate, :purchase_date, :cost, presence: true
  validates :cca_rate, numericality: { greater_than: 0, less_than_or_equal_to: 100 }
  validates :cost, numericality: { greater_than: 0 }

  # CCA deduction for a given tax year, applying the half-year rule in year of purchase
  def cca_deduction(year)
    opening        = ucc_opening || 0
    year_additions = purchase_date.year == year ? (cost + (additions || 0)) : (additions || 0)
    year_disposals = disposals || 0

    ucc = opening + year_additions - year_disposals
    return 0 if ucc <= 0

    deduction = ucc * cca_rate / 100
    purchase_date.year == year ? deduction / 2 : deduction
  end

  CCA_CLASSES = [
    { label: "Class 8 (20%) — Furniture, equipment", value: "Class 8", rate: 20.0 },
    { label: "Class 10 (30%) — Vehicles", value: "Class 10", rate: 30.0 },
    { label: "Class 10.1 (30%) — Passenger vehicles >$36k", value: "Class 10.1", rate: 30.0 },
    { label: "Class 12 (100%) — Tools under $500", value: "Class 12", rate: 100.0 },
    { label: "Class 50 (55%) — Computer hardware", value: "Class 50", rate: 55.0 },
    { label: "Class 14.1 (5%) — Goodwill, customer lists", value: "Class 14.1", rate: 5.0 }
  ].freeze
end
