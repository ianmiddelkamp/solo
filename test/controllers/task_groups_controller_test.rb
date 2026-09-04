require "test_helper"

class TaskGroupsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def setup
    @mine = BusinessProfile.for_user(users(:admin))
    @my_project = Project.create!(name: "Mine", client: @mine.clients.create!(name: "My Client"))
  end

  test "export returns docx and md for supported formats" do
    group = @my_project.task_groups.create!(title: "Backend", position: 1)
    group.tasks.create!(title: "Write tests", status: "todo", position: 1)

    get "/projects/#{@my_project.id}/task_groups/export", params: { format: "docx" }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_equal "application/vnd.openxmlformats-officedocument.wordprocessingml.document", response.media_type
    assert response.body.start_with?("PK"), "expected a zip (docx) payload"

    get "/projects/#{@my_project.id}/task_groups/export", params: { format: "md" }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_includes response.body, "# Task Groups"
    assert_includes response.body, "Write tests"
  end

  test "export docx round-trips readable text, including the task table" do
    group = @my_project.task_groups.create!(title: "Backend", position: 1)
    group.tasks.create!(title: "Write tests", status: "todo", position: 1)

    get "/projects/#{@my_project.id}/task_groups/export", params: { format: "docx" }, headers: auth_headers(users(:admin))
    assert_response :success

    require "docx"
    Tempfile.create(["task-groups", ".docx"]) do |tmp|
      tmp.binmode
      tmp.write(response.body)
      tmp.flush
      doc = Docx::Document.open(tmp.path)
      assert_includes doc.paragraphs.map(&:to_s).join(" "), "Backend"
      table_text = doc.tables.flat_map { |t| t.rows.flat_map { |r| r.cells.map(&:text) } }
      assert_includes table_text, "Write tests"
    end
  end

  test "export rejects an unsupported format" do
    get "/projects/#{@my_project.id}/task_groups/export", params: { format: "pdf" }, headers: auth_headers(users(:admin))
    assert_response :unprocessable_entity
  end

  test "export 404s for another tenant's project" do
    theirs = BusinessProfile.for_user(users(:member))
    their_project = Project.create!(name: "Theirs", client: theirs.clients.create!(name: "Their Client"))

    get "/projects/#{their_project.id}/task_groups/export", params: { format: "md" }, headers: auth_headers(users(:admin))
    assert_response :not_found
  end
end
