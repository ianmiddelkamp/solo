class ApplicationMailer < ActionMailer::Base
  default from: -> { mailer_from }
  layout "mailer"

  # Raised when a real (SMTP) send is attempted for a business that hasn't set up its own
  # Gmail credentials yet. Not raised in dev/test, where nothing is actually sent over SMTP.
  class EmailNotConfiguredError < StandardError; end

  private

  # Subclasses must set @business (a BusinessProfile) before calling this instead of `mail`
  # directly, so the per-tenant Gmail credentials get used for the actual SMTP send.
  def deliver_mail(to:, subject:, **mail_options)
    if smtp_delivery? && !@business&.email_configured?
      raise EmailNotConfiguredError,
        "Email sending isn't set up for this account yet. Add a Gmail address and app password in Settings before sending."
    end

    options = smtp_delivery? ? { delivery_method_options: @business.smtp_settings } : {}
    mail(to: to, subject: subject, **options, **mail_options)
  end

  def smtp_delivery?
    ActionMailer::Base.delivery_method == :smtp
  end

  def mailer_from
    name  = @business&.name.presence  || "Invoice App"
    email = @business&.email.presence || "noreply@example.com"
    "#{name} <#{email}>"
  end
end
