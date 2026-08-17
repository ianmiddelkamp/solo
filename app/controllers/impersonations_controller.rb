class ImpersonationsController < ApplicationController
  def destroy
    unless @impersonator
      render json: { error: "Not currently impersonating." }, status: :unprocessable_entity
      return
    end

    session = ImpersonationSession
      .where(impersonator: @impersonator, user: @current_user, ended_at: nil)
      .order(started_at: :desc)
      .first
    session&.end!

    token = JsonWebToken.encode(user_id: @impersonator.id)
    render json: {
      token: token,
      user: { id: @impersonator.id, name: @impersonator.name, email: @impersonator.email, role: @impersonator.role }
    }
  end
end
