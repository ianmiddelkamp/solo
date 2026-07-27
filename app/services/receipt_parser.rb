require "net/http"
require "json"
require "base64"

class ReceiptParser
  API_URL = "https://api.anthropic.com/v1/messages"
  MODEL   = "claude-opus-4-8"

  CATEGORIES = %w[advertising meals office professional_fees rent software supplies travel vehicle other].freeze

  def initialize(pdf_data)
    @pdf_b64 = Base64.strict_encode64(pdf_data)
  end

  def parse
    body = {
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: @pdf_b64
            }
          },
          {
            type: "text",
            text: prompt
          }
        ]
      }]
    }

    uri = URI(API_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = 60

    request = Net::HTTP::Post.new(uri)
    request["x-api-key"]         = ENV["ANTHROPIC_API_KEY"]
    request["anthropic-version"] = "2023-06-01"
    request["content-type"]      = "application/json"
    request.body = body.to_json

    response = http.request(request)
    parsed   = JSON.parse(response.body)

    unless response.is_a?(Net::HTTPSuccess)
      msg = parsed.dig("error", "message") || parsed["error"] || response.body
      raise "Claude API error: #{msg}"
    end

    text = parsed.dig("content", 0, "text")
    JSON.parse(text)
  rescue JSON::ParserError => e
    raise "Failed to parse Claude response as JSON: #{e.message}"
  end

  private

  def prompt
    <<~PROMPT
      Extract the following fields from this receipt or invoice. Return ONLY valid JSON with no markdown or explanation:
      {
        "date": "YYYY-MM-DD",
        "vendor": "vendor name",
        "description": "brief description of purchase",
        "amount": 0.00,
        "hst_paid": 0.00,
        "category": "one of: #{CATEGORIES.join(' | ')}"
      }
      - amount should be the total paid including any tax
      - hst_paid should be the HST/GST portion only (13% in Ontario)
      - Use null for any field you cannot determine
    PROMPT
  end
end
