class ApplicationController < ActionController::API
  before_action :authenticate_user!
  before_action :block_mutations_while_impersonating

  rescue_from ApplicationMailer::EmailNotConfiguredError do |e|
    render json: { error: e.message }, status: :unprocessable_entity
  end

  rescue_from ApplicationMailer::ImpersonationBlockedError do |e|
    render json: { error: e.message }, status: :forbidden
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
    Current.impersonating = @impersonator.present?
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    render json: { error: "Not authenticated." }, status: :unauthorized
  end

  # Impersonation is read-only for data: an admin impersonating a user can see exactly what
  # they see, but can't create/change/delete anything on their behalf or trigger any email send
  # (every mailer in this app is fired from a mutating action, so this alone covers email too —
  # see the second, independent guard in ApplicationMailer for defense-in-depth). Every mutating
  # route in this app is POST/PATCH/DELETE — there's no GET that has a side effect — so this one
  # check covers every controller uniformly with nothing to add per-controller.
  def block_mutations_while_impersonating
    return unless @impersonator
    return if %w[GET HEAD].include?(request.method)

    render json: { error: "Read-only while impersonating — actions are disabled." }, status: :forbidden
  end
end
