# Error tracking, backend only (see project_monitoring_plan memory for why frontend isn't wired
# up too — this app's failure modes that actually need automated eyes are server-side: Sidekiq
# jobs, PDF/email generation, DB errors — none of which show up on anyone's screen the way a
# React crash would).
#
# SENTRY_DSN is per-environment config, not a secret worth guarding closely (DSNs are write-only —
# safe to expose, Sentry's own docs note this is fine even in frontend bundles), but it still comes
# from ENV rather than being hardcoded, matching how every other piece of config in this app works.
# Blank/missing DSN means the SDK just doesn't send anything — safe to leave unset in dev/test.
Sentry.init do |config|
  config.dsn = ENV.fetch("SENTRY_DSN", nil)
  config.breadcrumbs_logger = [:active_support_logger, :http_logger]

  # Deliberately NOT sending default PII (request headers, IPs) — this app handles real client
  # names/emails/addresses and financial data. Stack traces and breadcrumbs are enough context for
  # debugging without sending IP addresses/headers to a third party by default.
  config.send_default_pii = false
end
