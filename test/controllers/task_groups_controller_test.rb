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

  test "export returns doc and md for supported formats" do
    group = @my_project.task_groups.create!(title: "Backend", position: 1)
    group.tasks.create!(title: "Write tests", status: "todo", position: 1)

    get "/projects/#{@my_project.id}/task_groups/export", params: { format: "doc" }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_includes response.body, "Backend"
    assert_includes response.body, "Write tests"

    get "/projects/#{@my_project.id}/task_groups/export", params: { format: "md" }, headers: auth_headers(users(:admin))
    assert_response :success
    assert_includes response.body, "# Task Groups"
    assert_includes response.body, "Write tests"
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
