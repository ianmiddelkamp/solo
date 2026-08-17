class InvitationsController < ApplicationController
  skip_before_action :authenticate_user!, only: [:show, :accept]
  before_action :require_admin!, only: [:index, :create, :destroy, :resend]
  before_action :set_invited_user, only: [:show, :accept]

  def index
    render json: User.where.not(invited_by_id: nil).order(created_at: :desc).as_json(
      only: %i[id email name invite_sent_at accepted_at created_at]
    )
  end

  def create
    user = User.new(
      email: invitation_params[:email],
      name: invitation_params[:email],
      invited_by: @current_user
    )

    if user.save
      InviteMailer.invite(user, @current_user).deliver_now
      render json: user.as_json(only: %i[id email name invite_sent_at]), status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def show
    render json: { email: @invited_user.email }
  end

  def accept
    if @invited_user.accept_invite!(name: accept_params[:name], password: accept_params[:password])
      token = JsonWebToken.encode(user_id: @invited_user.id)
      render json: {
        token: token,
        user: { id: @invited_user.id, name: @invited_user.name, email: @invited_user.email, role: @invited_user.role }
      }
    else
      render json: { errors: @invited_user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    user = User.find_by(id: params[:id])

    if user.nil? || user.invited_by_id.nil?
      render json: { error: "Invitation not found." }, status: :not_found
      return
    end

    if user.accepted_at.present?
      render json: { error: "This invite has already been accepted and can't be deleted." }, status: :unprocessable_entity
      return
    end

    user.destroy!
    head :no_content
  end

  def resend
    user = User.find_by(id: params[:id])

    if user.nil? || user.invited_by_id.nil?
      render json: { error: "Invitation not found." }, status: :not_found
      return
    end

    if user.accepted_at.present?
      render json: { error: "This invite has already been accepted." }, status: :unprocessable_entity
      return
    end

    user.update!(invite_sent_at: Time.current)
    InviteMailer.invite(user, user.invited_by).deliver_now
    render json: user.as_json(only: %i[id email name invite_sent_at])
  end

  private

  def require_admin!
    unless @current_user&.admin?
      render json: { error: "Not authorized." }, status: :forbidden
    end
  end

  def set_invited_user
    @invited_user = User.find_by(invite_token: params[:token])

    unless @invited_user && @invited_user.invited?
      render json: { error: "Invite link is invalid or has already been used." }, status: :not_found
    end
  end

  def invitation_params
    params.require(:invitation).permit(:email)
  end

  def accept_params
    params.permit(:name, :password)
  end
end
