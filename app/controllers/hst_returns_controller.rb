class HstReturnsController < ApplicationController
  before_action :set_business_profile
  before_action :set_hst_return, only: [:show, :update, :destroy]

  def index
    render json: @business_profile.hst_returns.order(period_start: :desc)
  end

  def show
    render json: @hst_return
  end

  def calculate
    return render json: { error: "period_start and period_end are required" }, status: :bad_request unless params[:period_start].present? && params[:period_end].present?

    result = HstReturn.calculate_for_period(params[:period_start], params[:period_end], @business_profile)
    render json: result
  end

  def create
    attrs = hst_return_params.to_h

    if params[:auto_calculate]
      calculated = HstReturn.calculate_for_period(attrs[:period_start], attrs[:period_end], @business_profile)
      attrs.merge!(calculated.slice(:total_revenue, :hst_collected, :input_tax_credits, :net_tax))
    end

    @hst_return = @business_profile.hst_returns.new(attrs)
    if @hst_return.save
      render json: @hst_return, status: :created
    else
      render json: { errors: @hst_return.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @hst_return.update(hst_return_params)
      render json: @hst_return
    else
      render json: { errors: @hst_return.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @hst_return.destroy
    head :no_content
  end

  private

  def set_business_profile
    @business_profile = BusinessProfile.for_user(@current_user)
  end

  def set_hst_return
    @hst_return = @business_profile.hst_returns.find(params[:id])
  end

  def hst_return_params
    params.require(:hst_return).permit(
      :period_start, :period_end, :status,
      :total_revenue, :hst_collected, :input_tax_credits, :net_tax,
      :filing_reference, :filed_at, :payment_due_date,
      :paid_at, :amount_paid, :notes
    )
  end
end
