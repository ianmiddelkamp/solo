class InviteMailer < ApplicationMailer
  def invite(user, inviter)
    @user            = user
    @inviter         = inviter
    @business        = BusinessProfile.for_user(inviter)
    @app_name        = Rails.application.config.x.app_name
    @app_description = Rails.application.config.x.app_description
    @accept_url = "#{frontend_host}/accept-invite/#{@user.invite_token}"

    deliver_mail(
      to:      @user.email,
      subject: "You've been invited to #{@app_name}"
    )
  end

  private

  def frontend_host
    Rails.application.config.x.frontend_host
  end
end
