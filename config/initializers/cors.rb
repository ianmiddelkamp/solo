Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Frontend and API are served same-origin in production (Caddy proxies /api/* to this app
    # under the same domain), so this mostly matters for local dev and any direct cross-origin
    # testing — not the normal request path once deployed.
    origins(*["http://localhost:5173", ENV["FRONTEND_HOST"]].compact)

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
