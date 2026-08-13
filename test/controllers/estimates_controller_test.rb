require "test_helper"

class EstimatesControllerTest < ActionDispatch::IntegrationTest
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}" }
  end

  test "index returns only the current user's estimates" do
    # Regression test: BusinessProfile#estimates (has_many through: :projects) requires
    # Project#estimates to exist as the source association — this was previously missing,
    # so GET /estimates 500'd for every request once BusinessProfile scoping was added.
    mine    = BusinessProfile.for_user(users(:admin))
    theirs  = BusinessProfile.for_user(users(:member))

    my_project    = Project.create!(name: "Mine", client: mine.clients.create!(name: "My Client"))
    their_project = Project.create!(name: "Theirs", client: theirs.clients.create!(name: "Their Client"))

    my_estimate    = Estimate.create!(project: my_project, status: "draft")
    Estimate.create!(project: their_project, status: "draft")

    get "/estimates", headers: auth_headers(users(:admin))
    assert_response :success

    ids = JSON.parse(response.body).map { |e| e["id"] }
    assert_includes ids, my_estimate.id
    assert_equal 1, ids.size
  end
end
