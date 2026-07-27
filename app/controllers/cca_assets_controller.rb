class CcaAssetsController < ApplicationController
  before_action :set_business_profile
  before_action :set_cca_asset, only: [:show, :update, :destroy]

  def index
    assets = @business_profile.cca_assets.order(:cca_class, :name)
    year = params[:year]&.to_i || Date.current.year - 1
    render json: assets.map { |a| a.as_json.merge(cca_deduction: a.cca_deduction(year)) }
  end

  def show
    year = params[:year]&.to_i || Date.current.year - 1
    render json: @cca_asset.as_json.merge(cca_deduction: @cca_asset.cca_deduction(year))
  end

  def create
    @cca_asset = @business_profile.cca_assets.new(cca_asset_params)
    if @cca_asset.save
      render json: @cca_asset, status: :created
    else
      render json: { errors: @cca_asset.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @cca_asset.update(cca_asset_params)
      render json: @cca_asset
    else
      render json: { errors: @cca_asset.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @cca_asset.destroy
    head :no_content
  end

  private

  def set_business_profile
    @business_profile = BusinessProfile.for_user(@current_user)
  end

  def set_cca_asset
    @cca_asset = @business_profile.cca_assets.find(params[:id])
  end

  def cca_asset_params
    params.require(:cca_asset).permit(:name, :cca_class, :cca_rate, :purchase_date, :cost, :ucc_opening, :additions, :disposals, :notes)
  end
end
