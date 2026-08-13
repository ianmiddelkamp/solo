require "test_helper"

class TimeEntriesControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  setup do
    @mine   = BusinessProfile.for_user(users(:admin))
    @theirs = BusinessProfile.for_user(users(:member))

    @my_project    = Project.create!(name: "Mine", client: @mine.clients.create!(name: "My Client"))
    @their_project = Project.create!(name: "Theirs", client: @theirs.clients.create!(name: "Their Client"))
  end

  test "create rejects a project_id belonging to another tenant" do
    assert_no_difference "TimeEntry.count" do
      post "/time_entries",
        params: { time_entry: { date: Date.current, hours: 1, project_id: @their_project.id } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :not_found
  end

  test "create rejects a client_id belonging to another tenant" do
    assert_no_difference "TimeEntry.count" do
      post "/time_entries",
        params: { time_entry: { date: Date.current, hours: 1, charge_code_id: nil, client_id: @theirs.clients.first.id, project_id: @my_project.id } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :not_found
  end

  test "create succeeds with a project_id belonging to the current tenant" do
    assert_difference "TimeEntry.count", 1 do
      post "/time_entries",
        params: { time_entry: { date: Date.current, hours: 1, project_id: @my_project.id } }.to_json,
        headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    end
    assert_response :created
  end

  test "update rejects re-pointing an entry at another tenant's project" do
    entry = TimeEntry.create!(user: users(:admin), date: Date.current, hours: 1, project: @my_project)

    patch "/time_entries/#{entry.id}",
      params: { time_entry: { project_id: @their_project.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :not_found

    assert_equal @my_project.id, entry.reload.project_id
  end
end
