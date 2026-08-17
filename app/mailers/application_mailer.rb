class ApplicationMailer < ActionMailer::Base
  default from: -> { mailer_from }
  layout "mailer"

  # Raised when a real (SMTP) send is attempted for a business that hasn't set up its own
  # Gmail credentials yet. Not raised in dev/test, where nothing is actually sent over SMTP.
  class EmailNotConfiguredError < StandardError; end

  # Raised if a send is attempted while an admin is impersonating a user. In practice every
  # mailer in this app is already triggered from a mutating controller action, and
  # ApplicationController#block_mutations_while_impersonating blocks those before they run — this
  # is a second, independent guard directly at the mailer layer, so a future mailer send wired to
  # something other than a plain POST/PATCH/DELETE action is still caught.
  class ImpersonationBlockedError < StandardError; end

  private

  # Subclasses must set @business (a BusinessProfile) before calling this instead of `mail`
  # directly, so the per-tenant Gmail credentials get used for the actual SMTP send.
  def deliver_mail(to:, subject:, **mail_options)
    if Current.impersonating
      raise ImpersonationBlockedError, "Email can't be sent while impersonating."
    end

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
    name  = @business&.name.presence  || Rails.application.config.x.app_name
    email = @business&.email.presence || "noreply@example.com"
    "#{name} <#{email}>"
  end
end
