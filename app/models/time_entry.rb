class TimeEntry < ApplicationRecord
  belongs_to :user
  belongs_to :project, optional: true
  belongs_to :charge_code, optional: true
  belongs_to :client, optional: true
  belongs_to :task, optional: true
  belongs_to :invoice, optional: true
  has_one :invoice_line_item

  validates :date, presence: true
  validates :hours, presence: true, numericality: { greater_than: 0 }
  validate :project_or_charge_code_required

  private

  def project_or_charge_code_required
    if project_id.blank? && charge_code_id.blank?
      errors.add(:base, "must belong to a project or charge code")
    elsif project_id.present? && charge_code_id.present?
      errors.add(:base, "cannot belong to both a project and a charge code")
    end
  end
end
