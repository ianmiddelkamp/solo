class PasswordResetsController < ApplicationController
  skip_before_action :authenticate_user!
  before_action :set_reset_user

  RESET_TOKEN_EXPIRY = 2.hours

  def show
    render json: { email: @reset_user.email }
  end

  def update
    if @reset_user.reset_password!(password: reset_params[:password])
      token = JsonWebToken.encode(user_id: @reset_user.id)
      render json: {
        token: token,
        user: { id: @reset_user.id, name: @reset_user.name, email: @reset_user.email, role: @reset_user.role }
      }
    else
      render json: { errors: @reset_user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_reset_user
    @reset_user = User.find_by(reset_password_token: params[:token])
    unless @reset_user && @reset_user.reset_password_sent_at && @reset_user.reset_password_sent_at > RESET_TOKEN_EXPIRY.ago
      render json: { error: "Reset link is invalid or has expired." }, status: :not_found
    end
  end

  def reset_params
    params.permit(:password)
  end
end
