class ImpersonationsController < ApplicationController
  # The exit action is itself a DELETE — without this, an admin could start impersonating and
  # never be able to get back out.
  skip_before_action :block_mutations_while_impersonating, only: :destroy

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
