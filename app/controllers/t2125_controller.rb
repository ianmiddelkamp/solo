class T2125Controller < ApplicationController
  def show
    year = params[:year]&.to_i || (Date.current.year - 1)
    bp   = BusinessProfile.for_user(@current_user)

    start_date = Date.new(year, 1, 1)
    end_date   = Date.new(year, 12, 31)

    # Revenue from invoices issued in the year
    invoices   = Invoice.joins(:client).where(clients: { business_profile_id: bp.id }, end_date: start_date..end_date)
    line_items = InvoiceLineItem.where(invoice: invoices)
    gross_revenue  = line_items.sum(:amount)
    hst_collected  = line_items.sum("amount * tax_rate / 100")

    # HST remitted from filed/paid returns in the year
    hst_remitted = bp.hst_returns
      .where(status: %w[filed paid])
      .where("period_end >= ? AND period_end <= ?", start_date, end_date)
      .sum(:amount_paid)

    # Expenses by category
    expenses_by_category = bp.expenses.for_year(year)
      .group(:category)
      .sum(:amount)
    total_expenses = expenses_by_category.values.sum

    # CCA
    cca_assets   = bp.cca_assets
    total_cca    = cca_assets.sum { |a| a.cca_deduction(year) }
    cca_details  = cca_assets.map { |a| { id: a.id, name: a.name, cca_class: a.cca_class, cca_rate: a.cca_rate, deduction: a.cca_deduction(year) } }

    # Home office
    home_office  = bp.home_office_profile
    home_office_deduction = home_office&.annual_deductible || 0

    net_income = gross_revenue - total_expenses - total_cca - home_office_deduction

    render json: {
      year: year,
      business_name: bp.name,
      hst_number: bp.hst_number,
      gross_revenue: gross_revenue,
      hst_collected: hst_collected,
      hst_remitted: hst_remitted,
      net_revenue: gross_revenue,
      expenses_by_category: expenses_by_category,
      total_expenses: total_expenses,
      cca_details: cca_details,
      total_cca: total_cca,
      home_office_deduction: home_office_deduction,
      home_office_percentage: home_office&.business_use_percentage || 0,
      net_income: net_income
    }
  end
end
