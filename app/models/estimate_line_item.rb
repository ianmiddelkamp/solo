class EstimateLineItem < ApplicationRecord
  belongs_to :estimate
  belongs_to :task, optional: true
  belongs_to :disbursement, optional: true

  validates :hours, :rate, :amount, presence: true

  # A task-backed line item that's been marked done, once its project opts into showing actual
  # hours (the default, matching today's always-on behavior), shows the task's real actual_hours
  # in place of the original estimate. This is the single source of truth for that substitution —
  # previously duplicated across EstimateDetail.tsx, estimate.html.erb, and
  # EstimatesController#diff_since_last_sent.
  def done?
    task&.status == "done"
  end

  # Fixed Price never substitutes actual hours, regardless of the project's show_actual_hours
  # setting — the whole point of Fixed Price is billing the agreed total, not actual work, so an
  # "estimated vs. actual" distinction doesn't apply to it. This also keeps the Fixed Price
  # adjustment line (see EstimateGenerator) permanently correct: it's computed once, at
  # generation time, from every task's estimated_hours — if task lines could later drift to
  # actual_hours while the adjustment stayed fixed, the total would stop landing on
  # billing_amount. Enforced here, at the single read path every renderer goes through, rather
  # than only in the UI, so it holds even for estimates generated before this rule existed.
  def show_actual_hours?
    estimate.project.show_actual_hours && !estimate.project.fixed_price?
  end

  def display_hours
    done? && show_actual_hours? ? task.actual_hours.to_f : hours
  end

  def display_amount
    done? && show_actual_hours? ? display_hours * rate : amount
  end
end
