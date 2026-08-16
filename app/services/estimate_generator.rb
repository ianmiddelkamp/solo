class EstimateGenerator
  def initialize(project:)
    @project  = project
    @tax_rate = @project.client.business_profile.tax_rate || 0
  end

  def generate!
    tasks = estimated_tasks
    disbursements = @project.disbursements
    return nil if tasks.empty? && disbursements.empty?

    ActiveRecord::Base.transaction do
      estimate = Estimate.create!(
        project: @project,
        status: "draft"
      )

      tasks.each do |task|
        rate = effective_rate
        hours = task.estimated_hours
        EstimateLineItem.create!(
          estimate: estimate,
          task: task,
          description: build_description(task),
          hours: hours,
          rate: rate,
          amount: hours * rate,
          tax_rate: @tax_rate
        )
      end

      # Every disbursement on the project is included on every generated estimate, paid or
      # unpaid — same rule as tasks: each "Create Estimate" click is a fresh, complete snapshot
      # of the project's current billable state, not an incremental diff of what's new.
      # tax_rate: 0 is intentional — disbursements are pass-through reimbursed costs, not
      # taxable labor, so they're excluded from the estimate's HST calculation (every total
      # calculation in the app sums tax per-line-item as amount * tax_rate / 100, so a 0 here
      # is the single point of truth that keeps disbursements out of tax everywhere).
      disbursements.each do |disbursement|
        EstimateLineItem.create!(
          estimate: estimate,
          disbursement: disbursement,
          description: "Disbursement · #{disbursement.description}",
          hours: 1,
          rate: disbursement.amount,
          amount: disbursement.amount,
          tax_rate: 0
        )
      end

      items    = estimate.estimate_line_items.reload
      subtotal = items.sum(:amount)
      tax      = items.sum { |i| i.amount * i.tax_rate / 100 }
      estimate.update!(total: subtotal + tax)
      estimate
    end
  end

  private

  def estimated_tasks
    @project.task_groups
            .order(:position)
            .includes(:tasks)
            .flat_map { |g| g.tasks.order(:position) }
            .select { |t| t.estimated_hours.present? && t.estimated_hours > 0 }
  end

  def build_description(task)
    group_title = task.task_group.title
    "#{group_title} · #{task.title}"
  end

  def effective_rate
    @project.rates.first&.rate ||
      @project.client.rates.first&.rate ||
      0
  end
end
