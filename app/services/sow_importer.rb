require "net/http"
require "json"

class SowImporter
  MAX_CHARS = {
    "groq"      => 40_000,
    "anthropic" => 40_000,
    "gemini"    => 40_000
  }.freeze

  PROVIDERS = {
    "anthropic" => {
      url:   "https://api.anthropic.com/v1/messages",
      model: "claude-opus-4-8"
    },
    "gemini" => {
      url:   "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      model: "gemini-1.5-flash"
    },
    "groq" => {
      url:   "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile"
    }
  }.freeze

  def self.available?
    provider = Rails.application.config.sow_provider
    return false if provider.blank?
    return false unless PROVIDERS.key?(provider)
    return false if Rails.application.config.sow_api_key.blank?
    true
  end

  def initialize(text)
    @text     = text
    @provider = Rails.application.config.sow_provider
    @api_key  = Rails.application.config.sow_api_key
    raise "SOW_PROVIDER '#{@provider}' is not supported. Choose: #{PROVIDERS.keys.join(', ')}" unless PROVIDERS.key?(@provider)
    raise "SOW_API_KEY is not set" if @api_key.blank?
  end

  def self.from_file(uploaded_file)
    new(extract_text(uploaded_file))
  end

  def self.extract_text(uploaded_file)
    case uploaded_file.content_type
    when "text/markdown", "text/plain", /markdown/
      uploaded_file.read
    when /word|docx|officedocument/
      extract_docx(uploaded_file)
    else
      uploaded_file.read
    end
  end

  def self.extract_docx(uploaded_file)
    require "docx"
    Tempfile.create(["sow", ".docx"]) do |tmp|
      tmp.binmode
      tmp.write(uploaded_file.read)
      tmp.flush
      doc = Docx::Document.open(tmp.path)
      doc.paragraphs.map(&:to_s).reject(&:blank?).join("\n")
    end
  end

  def parse
    raw = case @provider
    when "anthropic" then call_anthropic
    when "gemini"    then call_gemini
    when "groq"      then call_openai_compatible
    end
    normalize(JSON.parse(extract_json(raw)))
  rescue JSON::ParserError => e
    raise "Failed to parse AI response as JSON: #{e.message}"
  end

  private

  def call_anthropic
    body = {
      model: PROVIDERS["anthropic"][:model],
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    }

    response = post(PROVIDERS["anthropic"][:url],
      headers: {
        "x-api-key"         => @api_key,
        "anthropic-version" => "2023-06-01",
        "content-type"      => "application/json"
      },
      body: body
    )

    response.dig("content", 0, "text")
  end

  def call_gemini
    url = "#{PROVIDERS["gemini"][:url]}?key=#{@api_key}"
    body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.1 }
    }

    response = post(url,
      headers: { "content-type" => "application/json" },
      body: body
    )

    response.dig("candidates", 0, "content", "parts", 0, "text")
  end

  def call_openai_compatible
    body = {
      model: PROVIDERS["groq"][:model],
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0.1
    }

    response = post(PROVIDERS["groq"][:url],
      headers: {
        "Authorization" => "Bearer #{@api_key}",
        "content-type"  => "application/json"
      },
      body: body
    )

    response.dig("choices", 0, "message", "content")
  end

  def post(url, headers:, body:)
    uri  = URI(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"
    http.read_timeout = 120

    request = Net::HTTP::Post.new(uri)
    headers.each { |k, v| request[k] = v }
    request.body = body.to_json

    response = http.request(request)
    parsed   = JSON.parse(response.body)

    unless response.is_a?(Net::HTTPSuccess)
      msg = parsed.dig("error", "message") || parsed["error"] || response.body
      raise "#{@provider.capitalize} API error: #{msg}"
    end

    parsed
  end

  MAX_GROUPS = ENV["SOW_MAX_GROUPS"]&.to_i

  def normalize(parsed)
    groups = parsed.is_a?(Array) ? parsed : [parsed]
    groups = groups.first(MAX_GROUPS) if MAX_GROUPS
    groups.each do |g|
      raise "Unexpected response structure" unless g.is_a?(Hash) && g["title"].present? && g["tasks"].is_a?(Array)
    end
    groups
  end

  def extract_json(text)
    return "" if text.blank?
    if (match = text.match(/```[^\n]*\n(.*?)```/m))
      match[1].strip
    elsif (match = text.match(/(\[.*\]|\{.*\})/m))
      match[1].strip
    else
      text.strip
    end
  end

  def prompt(max_chars: 12000)
    limit_line = MAX_GROUPS ? "Return at most #{MAX_GROUPS} group(s)." : ""
    <<~PROMPT
      You are parsing a statement of work document. Split the work into logical task groups by phase, section, or deliverable area.

      Return ONLY a JSON array with no explanation, no markdown. #{limit_line}

      [
        {
          "title": "Phase 1 — Discovery",
          "tasks": [
            { "title": "Stakeholder interviews" },
            { "title": "Requirements gathering" }
          ]
        }
      ]

      Rules:
      - Keep task titles concise (under 100 characters)
      - Do not include pricing, dates, or payment terms as tasks
      - Do not include boilerplate legal text as tasks
      - Return ONLY the JSON array, nothing else

      Document:
      ---
      #{@text.truncate(max_chars)}
      ---
    PROMPT
  end
end
