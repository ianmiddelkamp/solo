class HomeOfficeProfile < ApplicationRecord
  belongs_to :business_profile

  def business_use_percentage
    if use_square_footage && total_sqft.to_f > 0
      (office_sqft.to_f / total_sqft.to_f * 100).round(2)
    elsif !use_square_footage && total_rooms.to_i > 0
      (office_rooms.to_f / total_rooms.to_f * 100).round(2)
    else
      0.0
    end
  end

  def annual_deductible
    monthly_total = (monthly_rent || 0) + (monthly_utilities || 0) +
                    (monthly_internet || 0) + (monthly_other || 0)
    (monthly_total * 12 * business_use_percentage / 100).round(2)
  end
end
