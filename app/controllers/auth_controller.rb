class AuthController < ApplicationController
  skip_before_action :authenticate_user!

  def login
    # A real case-insensitive match at the DB level, not just a downcased exact match — the
    # latter depends on every stored email already being lowercase, which silently breaks the
    # moment any row is written without going through User#normalize_email (a raw SQL fix, a
    # seed script, an update_column call). This is correct regardless of how a row got there.
    user = User.where("lower(email) = ?", params[:email]&.strip&.downcase).first

    if user&.archived?
      render json: { error: "This account has been deactivated." }, status: :unauthorized
      return
    end

    if user&.authenticate(params[:password])
      user.update_column(:last_login_at, Time.current)
      token = JsonWebToken.encode(user_id: user.id)
      render json: { token: token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    else
      render json: { error: "Invalid email or password." }, status: :unauthorized
    end
  end
end
