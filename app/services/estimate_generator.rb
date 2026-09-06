class EstimateGenerator
  def initialize(project:, contact:)
    @project  = project
    @contact  = contact
    @tax_rate = @project.client.business_profile.tax_rate || 0
  end

  def generate!
    tasks = @project.estimated_tasks
    disbursements = @project.disbursements
    return nil if tasks.empty? && disbursements.empty? && !@project.fixed_price?

    ActiveRecord::Base.transaction do
      estimate = Estimate.create!(
        project: @project,
        contact: @contact,
        status: "draft"
      )

      # A client should never be sent a quote that disagrees with what they'll actually be
      # billed: a Fixed Price project's estimate shows the agreed total, not a raw hours×rate
      # sum, via the same true-up adjustment line the invoice side uses.
      if @project.fixed_price?
        nominal_total = 0
        if @project.show_task_breakdown
          tasks.each do |task|
            rate  = effective_rate
            hours = task.estimated_hours
            amount = hours * rate
            nominal_total += amount
            EstimateLineItem.create!(
              estimate: estimate,
              task: task,
              description: build_description(task),
              hours: hours,
              rate: rate,
              amount: amount,
              tax_rate: @tax_rate
            )
          end

          adjustment = @project.billing_amount - nominal_total
          # Skip the line entirely when the tasks' nominal total already lands exactly on the
          # fixed price — nothing to true up, so there's nothing useful to show the client.
          if adjustment.round(2) != 0
            EstimateLineItem.create!(
              estimate: estimate,
              description: "Fixed price adjustment",
              hours: 0,
              rate: 0,
              amount: adjustment,
              tax_rate: @tax_rate
            )
          end
        else
          EstimateLineItem.create!(
            estimate: estimate,
            description: "#{@project.name} · Fixed price",
            hours: 0,
            rate: 0,
            amount: @project.billing_amount,
            tax_rate: @tax_rate
          )
        end
      elsif @project.capped?
        nominal_total = 0
        tasks.each do |task|
          rate  = effective_rate
          hours = task.estimated_hours
          amount = hours * rate
          nominal_total += amount
          EstimateLineItem.create!(
            estimate: estimate,
            task: task,
            description: build_description(task),
            hours: hours,
            rate: rate,
            amount: amount,
            tax_rate: @tax_rate
          )
        end

        # Same ceiling InvoiceGenerator#bill_capped enforces: never quote more than what's
        # actually left under the project's cap, net of whatever's already been invoiced against
        # it — not the full cap in isolation, which would overstate what's left for an ongoing
        # capped project. Never goes below $0 room, so a fully-consumed cap quotes $0 more,
        # rather than a nonsensical negative total.
        already = InvoiceLineItem.where(project: @project).sum(:amount)
        room = [@project.billing_amount - already, 0].max
        overage = nominal_total - room
        if overage.round(2) > 0
          EstimateLineItem.create!(
            estimate: estimate,
            description: "Billing cap adjustment",
            hours: 0,
            rate: 0,
            amount: -overage,
            tax_rate: @tax_rate
          )
        end
      else
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
