require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  setup do
    @mine   = BusinessProfile.for_user(users(:admin))
    @theirs = BusinessProfile.for_user(users(:member))

    @my_project = Project.create!(name: "Mine", client: @mine.clients.create!(name: "My Client"))
    @my_group   = TaskGroup.create!(project: @my_project, title: "Group A")
    @task       = Task.create!(task_group: @my_group, title: "Task", status: "todo")

    their_project = Project.create!(name: "Theirs", client: @theirs.clients.create!(name: "Their Client"))
    @their_group  = TaskGroup.create!(project: their_project, title: "Their Group")
  end

  test "update ignores an attempt to re-parent a task into another tenant's task_group" do
    patch "/projects/#{@my_project.id}/task_groups/#{@my_group.id}/tasks/#{@task.id}",
      params: { task: { task_group_id: @their_group.id, title: "Renamed" } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")

    assert_response :success
    assert_equal @my_group.id, @task.reload.task_group_id
    assert_equal "Renamed", @task.title
  end

  test "create ignores an attacker-supplied task_group_id" do
    post "/projects/#{@my_project.id}/task_groups/#{@my_group.id}/tasks",
      params: { task: { title: "New Task", task_group_id: @their_group.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")

    assert_response :created
    created = Task.order(:id).last
    assert_equal @my_group.id, created.task_group_id
  end
end
