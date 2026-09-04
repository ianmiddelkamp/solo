require "net/http"
require "json"
require "base64"

# Summarizes a project (details, task groups, and attached documents) via the Claude API, using
# the same direct Anthropic call pattern as ReceiptParser. The instructions given to the AI are
# keyed by "purpose" so new use cases can be added later without touching how the project's
# context is gathered — only "project_brief" exists today.
class ProjectAiSummary
  API_URL = "https://api.anthropic.com/v1/messages"
  MODEL   = "claude-opus-4-8"
  MAX_TOKENS = 4096

  # Limits on what gets sent to Claude, independent of the 20MB-per-file limit enforced at
  # upload time (see ProjectAttachmentsController) — keeps prompt size, cost, and latency
  # reasonable regardless of how large or how many files are attached to the project.
  #
  # 6MB x 5 files = 30MB, kept under Anthropic's 32MB total request-size limit for PDFs with
  # some headroom for the rest of the prompt — 8MB x 5 (40MB) could exceed that limit outright.
  MAX_DOCUMENTS = 5
  MAX_DOCUMENT_BYTES = 6.megabytes
  MAX_EXTRACTED_TEXT_CHARS = 20_000

  TEXT_CONTENT_TYPES = %w[text/plain text/markdown text/x-markdown text/csv].freeze
  DOCX_CONTENT_TYPES = %w[
    application/msword
    application/vnd.openxmlformats-officedocument.wordprocessingml.document
  ].freeze

  PURPOSES = {
    "project_brief" => {
      label: "Project Brief",
      instructions: <<~TEXT.strip
        Prepare a project brief for a new team member or stakeholder joining this project.
        Summarize the project's goal, scope, and current state of progress based on the task
        groups and their statuses. Call out any notable risks, blockers, or open questions you
        can infer from the task titles, statuses, and attached documents. Keep it concise
        (roughly 300-500 words), written in clear prose with short headings, not raw data dumps.
      TEXT
    }
  }.freeze

  def self.purposes
    PURPOSES.map { |key, v| { key: key, label: v[:label] } }
  end

  def self.available?
    ENV["ANTHROPIC_API_KEY"].present?
  end

  # attachment_ids: blob ids of the project's attachments to include, as chosen by the user in
  # the UI — nothing is included unless explicitly selected, so a project with a large document
  # library doesn't silently balloon prompt size/cost on every generation.
  def initialize(project:, purpose:, attachment_ids: [])
    @project = project
    @purpose_key = purpose
    @purpose = PURPOSES.fetch(purpose) { raise "Unknown purpose '#{purpose}'" }
    @attachment_ids = Array(attachment_ids).map(&:to_i)
    raise "ANTHROPIC_API_KEY is not set" unless self.class.available?
  end

  def generate
    response = post(build_content_blocks)
    response.dig("content", 0, "text")
  end

  private

  def build_content_blocks
    [{ type: "text", text: prompt_text }, *document_blocks]
  end

  def prompt_text
    <<~PROMPT
      #{@purpose[:instructions]}

      Project: #{@project.name}
      Client: #{@project.client&.name}
      Description: #{@project.description.presence || "(none provided)"}

      Task Groups:
      #{task_groups_outline.presence || "(no task groups yet)"}
    PROMPT
  end

  def task_groups_outline
    @project.task_groups.order(:position).map do |group|
      lines = group.tasks.map do |t|
        estimate = t.estimated_hours ? " (est. #{t.estimated_hours}h)" : ""
        "  - [#{t.status}] #{t.title}#{estimate}"
      end
      "#{group.title}:\n#{lines.join("\n")}"
    end.join("\n\n")
  end

  def document_blocks
    return [] if @attachment_ids.empty?

    @project.project_files
      .select { |attachment| @attachment_ids.include?(attachment.blob_id) }
      .select { |attachment| attachment.byte_size <= MAX_DOCUMENT_BYTES }
      .first(MAX_DOCUMENTS)
      .filter_map { |attachment| document_block(attachment) }
  end

  def document_block(attachment)
    blob = attachment.blob
    case blob.content_type
    when "application/pdf"
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: Base64.strict_encode64(blob.download) } }
    when /^image\//
      { type: "image", source: { type: "base64", media_type: blob.content_type, data: Base64.strict_encode64(blob.download) } }
    when *TEXT_CONTENT_TYPES
      text_document_block(blob.filename.to_s, blob.download.to_s)
    when *DOCX_CONTENT_TYPES
      text_document_block(blob.filename.to_s, extract_docx(blob))
    end
  end

  def text_document_block(filename, text)
    { type: "text", text: "Document: #{filename}\n---\n#{text.truncate(MAX_EXTRACTED_TEXT_CHARS)}\n---" }
  end

  def extract_docx(blob)
    require "docx"
    Tempfile.create(["project-doc", ".docx"]) do |tmp|
      tmp.binmode
      tmp.write(blob.download)
      tmp.flush
      Docx::Document.open(tmp.path).paragraphs.map(&:to_s).reject(&:blank?).join("\n")
    end
  rescue => e
    "(could not extract text from #{blob.filename}: #{e.message})"
  end

  def post(content_blocks)
    body = { model: MODEL, max_tokens: MAX_TOKENS, messages: [{ role: "user", content: content_blocks }] }

    uri = URI(API_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = 120

    request = Net::HTTP::Post.new(uri)
    request["x-api-key"] = ENV["ANTHROPIC_API_KEY"]
    request["anthropic-version"] = "2023-06-01"
    request["content-type"] = "application/json"
    request.body = body.to_json

    response = http.request(request)
    parsed = JSON.parse(response.body)

    unless response.is_a?(Net::HTTPSuccess)
      msg = parsed.dig("error", "message") || parsed["error"] || response.body
      raise "Claude API error: #{msg}"
    end

    parsed
  end
end
