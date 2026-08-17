class PasswordResetMailer < ApplicationMailer
  def reset(user)
    @user            = user
    @business        = BusinessProfile.for_user(user)
    @app_name        = Rails.application.config.x.app_name
    @reset_url       = "#{frontend_host}/reset-password/#{@user.reset_password_token}"

    deliver_mail(
      to:      @user.email,
      subject: "Reset your #{@app_name} password"
    )
  end

  private

  def frontend_host
    Rails.application.config.x.frontend_host
  end
end
