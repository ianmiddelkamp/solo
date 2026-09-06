require "test_helper"

class ProjectsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def setup
    @bp = BusinessProfile.for_user(users(:admin))
    @client = @bp.clients.create!(name: "Client")
  end

  test "create round-trips all five billing/display fields" do
    post "/projects",
      params: {
        project: {
          name: "New Project", client_id: @client.id,
          billing_mode: "capped", billing_amount: 2000,
          show_task_breakdown: false, show_hours: false, show_actual_hours: false
        }
      }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :created

    body = JSON.parse(response.body)
    assert_equal "capped", body["billing_mode"]
    assert_equal 2000.0, body["billing_amount"]
    assert_equal false, body["show_task_breakdown"]
    assert_equal false, body["show_hours"]
    assert_equal false, body["show_actual_hours"]
  end

  test "new projects default to hourly with all display options on" do
    post "/projects",
      params: { project: { name: "New Project", client_id: @client.id } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :created

    body = JSON.parse(response.body)
    assert_equal "hourly", body["billing_mode"]
    assert_nil body["billing_amount"]
    assert_equal true, body["show_task_breakdown"]
    assert_equal true, body["show_hours"]
    assert_equal true, body["show_actual_hours"]
  end

  test "create rejects an invalid billing_mode" do
    post "/projects",
      params: { project: { name: "New Project", client_id: @client.id, billing_mode: "bogus" } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :unprocessable_entity
  end

  test "create requires billing_amount when billing_mode is not hourly" do
    post "/projects",
      params: { project: { name: "New Project", client_id: @client.id, billing_mode: "fixed_price" } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :unprocessable_entity

    body = JSON.parse(response.body)
    assert_includes body["errors"].join, "Billing amount"
  end

  test "update can change billing mode and amount" do
    project = @client.projects.create!(name: "Project")

    patch "/projects/#{project.id}",
      params: { project: { billing_mode: "fixed_price", billing_amount: 4000 } }.to_json,
      headers: auth_headers(users(:admin)).merge("Content-Type" => "application/json")
    assert_response :success

    project.reload
    assert_equal "fixed_price", project.billing_mode
    assert_equal 4000, project.billing_amount
  end
end
