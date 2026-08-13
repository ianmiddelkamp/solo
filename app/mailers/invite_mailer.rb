class InviteMailer < ApplicationMailer
  def invite(user, inviter)
    @user     = user
    @inviter  = inviter
    @business = BusinessProfile.for_user(inviter)
    @accept_url = "#{frontend_host}/accept-invite/#{@user.invite_token}"

    mail(
      to:      @user.email,
      subject: "You've been invited to #{@business.name.presence || 'Invoice App'}"
    )
  end

  private

  def frontend_host
    Rails.application.config.x.frontend_host
  end
end
