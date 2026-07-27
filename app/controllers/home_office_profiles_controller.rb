class HomeOfficeProfilesController < ApplicationController
  before_action :set_business_profile

  def show
    profile = @business_profile.home_office_profile
    if profile
      render json: profile.as_json.merge(
        business_use_percentage: profile.business_use_percentage,
        annual_deductible: profile.annual_deductible
      )
    else
      render json: nil
    end
  end

  def update
    profile = @business_profile.home_office_profile || @business_profile.build_home_office_profile
    if profile.update(home_office_params)
      render json: profile.as_json.merge(
        business_use_percentage: profile.business_use_percentage,
        annual_deductible: profile.annual_deductible
      )
    else
      render json: { errors: profile.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_business_profile
    @business_profile = BusinessProfile.for_user(@current_user)
  end

  def home_office_params
    params.require(:home_office_profile).permit(
      :total_rooms, :office_rooms,
      :monthly_rent, :monthly_utilities, :monthly_internet, :monthly_other,
      :use_square_footage, :total_sqft, :office_sqft, :notes
    )
  end
end
