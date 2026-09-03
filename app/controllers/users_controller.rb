class UsersController < ApplicationController
  before_action :require_admin!
  before_action :set_user, only: [:show, :update, :archive, :unarchive, :send_password_reset, :impersonate]

  def index
    users = User.where.not(accepted_at: nil).order(:name)
    render json: users.map { |u| user_json(u) }
  end

  def show
    render json: user_json(@user, detailed: true)
  end

  def update
    if @user == @current_user && user_params[:role].present? && user_params[:role] != @user.role
      render json: { error: "You can't change your own role." }, status: :unprocessable_entity
      return
    end

    if @user.update(user_params)
      render json: user_json(@user)
    else
      render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def archive
    if @user == @current_user
      render json: { error: "You can't archive your own account." }, status: :unprocessable_entity
      return
    end

    @user.archive!
    render json: user_json(@user)
  end

  def unarchive
    @user.unarchive!
    render json: user_json(@user)
  end

  def send_password_reset
    @user.generate_reset_password_token!
    PasswordResetMailer.reset(@user, @current_user).deliver_now
    render json: { message: "Password reset email sent to #{@user.email}." }
  end

  def impersonate
    if @user == @current_user
      render json: { error: "You can't impersonate yourself." }, status: :unprocessable_entity
      return
    end
    if @user.admin?
      render json: { error: "You can't impersonate another admin." }, status: :unprocessable_entity
      return
    end
    if @user.archived?
      render json: { error: "You can't impersonate an archived user." }, status: :unprocessable_entity
      return
    end

    session = ImpersonationSession.create!(impersonator: @current_user, user: @user, started_at: Time.current)
    token = JsonWebToken.encode(user_id: @user.id, impersonator_id: @current_user.id)
    render json: {
      token: token,
      impersonation_session_id: session.id,
      user: { id: @user.id, name: @user.name, email: @user.email, role: @user.role }
    }
  end

  private

  def require_admin!
    unless @current_user&.admin?
      render json: { error: "Not authorized." }, status: :forbidden
    end
  end

  def set_user
    @user = User.where.not(accepted_at: nil).find(params[:id])
  end

  def user_params
    params.require(:user).permit(:name, :email, :role)
  end

  def user_json(user, detailed: false)
    business = user.business_profile
    base = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      archived_at: user.archived_at,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      business_name: business&.name
    }
    return base unless detailed

    base.merge(
      time_entries_count: user.time_entries.count
    )
  end
end
