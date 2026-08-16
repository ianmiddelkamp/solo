require "test_helper"

class ProjectDisbursementsControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  def setup
    @mine = BusinessProfile.for_user(users(:admin))
    @theirs = BusinessProfile.for_user(users(:member))
    @my_project = Project.create!(name: "Mine", client: @mine.clients.create!(name: "My Client"))
    @their_project = Project.create!(name: "Theirs", client: @theirs.clients.create!(name: "Their Client"))
  end

  test "index only returns disbursements for the current user's project" do
    mine = Disbursement.create!(project: @my_project, description: "Travel", amount: 50)
    Disbursement.create!(project: @their_project, description: "Materials", amount: 20)

    get "/projects/#{@my_project.id}/disbursements", headers: auth_headers(users(:admin))
    assert_response :success

    ids = JSON.parse(response.body).map { |d| d["id"] }
    assert_equal [ mine.id ], ids
  end

  test "cannot list disbursements on another business's project" do
    get "/projects/#{@their_project.id}/disbursements", headers: auth_headers(users(:admin))
    assert_response :not_found
  end

  test "create adds a disbursement to the project" do
    post "/projects/#{@my_project.id}/disbursements",
      params: { disbursement: { description: "Filing fee", amount: 15.25 } },
      headers: auth_headers(users(:admin))

    assert_response :created
    assert_equal 1, @my_project.disbursements.count
  end

  test "update can toggle paid" do
    d = Disbursement.create!(project: @my_project, description: "Travel", amount: 50)

    patch "/projects/#{@my_project.id}/disbursements/#{d.id}",
      params: { disbursement: { paid: true } },
      headers: auth_headers(users(:admin))

    assert_response :success
    assert d.reload.paid
  end

  test "cannot update another business's disbursement" do
    d = Disbursement.create!(project: @their_project, description: "Travel", amount: 50)

    patch "/projects/#{@my_project.id}/disbursements/#{d.id}",
      params: { disbursement: { paid: true } },
      headers: auth_headers(users(:admin))

    assert_response :not_found
  end

  test "destroy removes the disbursement" do
    d = Disbursement.create!(project: @my_project, description: "Travel", amount: 50)

    delete "/projects/#{@my_project.id}/disbursements/#{d.id}", headers: auth_headers(users(:admin))

    assert_response :no_content
    assert_not Disbursement.exists?(d.id)
  end
end
