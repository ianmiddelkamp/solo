require "test_helper"

class ProjectsAiSummaryTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def setup
    @mine = BusinessProfile.for_user(users(:admin))
    @project = Project.create!(name: "Mine", client: @mine.clients.create!(name: "My Client"))
  end

  test "returns service_unavailable when ANTHROPIC_API_KEY is not set" do
    original = ENV["ANTHROPIC_API_KEY"]
    ENV["ANTHROPIC_API_KEY"] = nil

    post "/projects/#{@project.id}/ai_summary",
      params: { purpose: "project_brief", format: "md" }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :service_unavailable
  ensure
    ENV["ANTHROPIC_API_KEY"] = original
  end

  test "returns a markdown file when configured" do
    with_stubbed_generate do
      post "/projects/#{@project.id}/ai_summary",
        params: { purpose: "project_brief", format: "md" }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
      assert_response :success
      assert_equal "text/markdown", response.media_type
      assert_includes response.body, "Stubbed project brief content."
    end
  end

  test "returns a docx file when configured" do
    with_stubbed_generate do
      post "/projects/#{@project.id}/ai_summary",
        params: { purpose: "project_brief", format: "docx" }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
      assert_response :success
      assert_equal "application/vnd.openxmlformats-officedocument.wordprocessingml.document", response.media_type
      assert response.body.start_with?("PK"), "expected a zip (docx) payload"
    end
  end

  test "rejects an unsupported format" do
    with_stubbed_generate do
      post "/projects/#{@project.id}/ai_summary",
        params: { purpose: "project_brief", format: "pdf" }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
      assert_response :unprocessable_entity
    end
  end

  test "404s for another tenant's project" do
    theirs = BusinessProfile.for_user(users(:member))
    their_project = Project.create!(name: "Theirs", client: theirs.clients.create!(name: "Their Client"))

    post "/projects/#{their_project.id}/ai_summary",
      params: { purpose: "project_brief", format: "md" }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :not_found
  end

  private

  def with_stubbed_generate
    original = ENV["ANTHROPIC_API_KEY"]
    ENV["ANTHROPIC_API_KEY"] = "fake-key-for-test"
    stub_method = ProjectAiSummary.instance_method(:generate)
    ProjectAiSummary.define_method(:generate) { "Stubbed project brief content." }
    yield
  ensure
    ENV["ANTHROPIC_API_KEY"] = original
    ProjectAiSummary.define_method(:generate, stub_method) if stub_method
  end
end
