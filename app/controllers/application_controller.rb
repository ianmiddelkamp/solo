class ApplicationController < ActionController::API
  before_action :authenticate_user!

  private

  def current_business_profile
    @current_business_profile ||= BusinessProfile.for_user(@current_user)
  end

  def authenticate_user!
    header = request.headers["Authorization"]
    token  = header&.split(" ")&.last

    if token.nil?
      render json: { error: "Not authenticated." }, status: :unauthorized
      return
    end

    decoded = JsonWebToken.decode(token)
    @current_user = User.find(decoded[:user_id])
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    render json: { error: "Not authenticated." }, status: :unauthorized
  end
end
