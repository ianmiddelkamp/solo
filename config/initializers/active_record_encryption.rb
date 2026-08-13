# Keys for ActiveRecord::Encryption (used by `encrypts` on model attributes, e.g.
# BusinessProfile#gmail_app_password). Kept in ENV rather than Rails credentials to match
# how the rest of this app's secrets are configured (SECRET_KEY_BASE, GMAIL_APP_PASSWORD, etc).
#
# Dev and prod MUST use different keys — generate separately for each with:
#   bin/rails runner 'require "securerandom"; puts SecureRandom.alphanumeric(32)'
#
# Test uses fixed, non-secret keys since the test DB is ephemeral and ephemeral data isn't
# sensitive — this avoids needing real keys set in CI.
if Rails.env.test?
  Rails.application.config.active_record.encryption.primary_key = "test_primary_key_not_secret_00000"
  Rails.application.config.active_record.encryption.deterministic_key = "test_deterministic_key_not_secret"
  Rails.application.config.active_record.encryption.key_derivation_salt = "test_key_derivation_salt_not_secret"
else
  Rails.application.config.active_record.encryption.primary_key = ENV.fetch("AR_ENCRYPTION_PRIMARY_KEY")
  Rails.application.config.active_record.encryption.deterministic_key = ENV.fetch("AR_ENCRYPTION_DETERMINISTIC_KEY")
  Rails.application.config.active_record.encryption.key_derivation_salt = ENV.fetch("AR_ENCRYPTION_KEY_DERIVATION_SALT")
end
