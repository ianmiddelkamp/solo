class ApplicationController < ActionController::API
  before_action :authenticate_user!

  rescue_from ApplicationMailer::EmailNotConfiguredError do |e|
    render json: { error: e.message }, status: :unprocessable_entity
  end

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

    # When present, this token was minted for an admin impersonating another user — every
    # existing tenant-scoped controller/query already derives entirely from @current_user
    # (see current_business_profile above), so resolving it to the target here is the only
    # thing impersonation needs to change; nothing downstream needs to know about it.
    @impersonator = User.find(decoded[:impersonator_id]) if decoded[:impersonator_id].present?
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    render json: { error: "Not authenticated." }, status: :unauthorized
  end
end
