class ApplicationMailer < ActionMailer::Base
  default from: -> { mailer_from }
  layout "mailer"

  private

  # Subclasses must set @business (a BusinessProfile) before calling `mail`.
  def mailer_from
    name  = @business&.name.presence  || "Invoice App"
    email = @business&.email.presence || "noreply@example.com"
    "#{name} <#{email}>"
  end
end
