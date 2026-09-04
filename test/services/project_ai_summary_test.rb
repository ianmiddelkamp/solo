require "test_helper"

class ProjectAiSummaryTest < ActiveSupport::TestCase
  def setup
    @bp = BusinessProfile.for_user(users(:admin))
    @project = Project.create!(name: "Website Redesign", client: @bp.clients.create!(name: "Acme"))
  end

  test "available? reflects whether ANTHROPIC_API_KEY is set" do
    original = ENV["ANTHROPIC_API_KEY"]
    ENV["ANTHROPIC_API_KEY"] = nil
    refute ProjectAiSummary.available?
    ENV["ANTHROPIC_API_KEY"] = "fake-key"
    assert ProjectAiSummary.available?
  ensure
    ENV["ANTHROPIC_API_KEY"] = original
  end

  test "raises for an unknown purpose" do
    ENV["ANTHROPIC_API_KEY"] = "fake-key"
    error = assert_raises(RuntimeError) { ProjectAiSummary.new(project: @project, purpose: "nonsense") }
    assert_match(/Unknown purpose/, error.message)
  ensure
    ENV["ANTHROPIC_API_KEY"] = nil
  end

  test "prompt includes project details and task groups" do
    ENV["ANTHROPIC_API_KEY"] = "fake-key"
    group = @project.task_groups.create!(title: "Design", position: 1)
    group.tasks.create!(title: "Wireframes", status: "done", position: 1)

    summary = ProjectAiSummary.new(project: @project, purpose: "project_brief")
    prompt = summary.send(:prompt_text)

    assert_includes prompt, "Website Redesign"
    assert_includes prompt, "Acme"
    assert_includes prompt, "Design:"
    assert_includes prompt, "[done] Wireframes"
  ensure
    ENV["ANTHROPIC_API_KEY"] = nil
  end

  test "document_blocks includes nothing unless attachments are explicitly selected" do
    ENV["ANTHROPIC_API_KEY"] = "fake-key"
    @project.project_files.attach(
      io: StringIO.new("small file"), filename: "notes.txt", content_type: "text/plain"
    )

    summary = ProjectAiSummary.new(project: @project, purpose: "project_brief")
    assert_empty summary.send(:document_blocks)
  ensure
    ENV["ANTHROPIC_API_KEY"] = nil
  end

  test "document_blocks includes a selected attachment" do
    ENV["ANTHROPIC_API_KEY"] = "fake-key"
    @project.project_files.attach(
      io: StringIO.new("small file"), filename: "notes.txt", content_type: "text/plain"
    )
    blob_id = @project.project_files.first.blob_id

    summary = ProjectAiSummary.new(project: @project, purpose: "project_brief", attachment_ids: [blob_id])
    blocks = summary.send(:document_blocks)

    assert_equal 1, blocks.size
    assert_includes blocks.first[:text], "notes.txt"
  ensure
    ENV["ANTHROPIC_API_KEY"] = nil
  end

  test "document_blocks excludes a selected attachment over the size limit" do
    ENV["ANTHROPIC_API_KEY"] = "fake-key"
    @project.project_files.attach(
      io: StringIO.new("small file"), filename: "notes.txt", content_type: "text/plain"
    )
    blob_id = @project.project_files.first.blob_id

    summary = ProjectAiSummary.new(project: @project, purpose: "project_brief", attachment_ids: [blob_id])
    stub_const_max = ProjectAiSummary::MAX_DOCUMENT_BYTES
    ProjectAiSummary.send(:remove_const, :MAX_DOCUMENT_BYTES)
    ProjectAiSummary.const_set(:MAX_DOCUMENT_BYTES, 1)

    blocks = summary.send(:document_blocks)
    assert_empty blocks
  ensure
    ENV["ANTHROPIC_API_KEY"] = nil
    ProjectAiSummary.send(:remove_const, :MAX_DOCUMENT_BYTES)
    ProjectAiSummary.const_set(:MAX_DOCUMENT_BYTES, stub_const_max) if stub_const_max
  end
end
