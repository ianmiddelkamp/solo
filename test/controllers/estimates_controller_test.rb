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

  test "sending and re-showing an estimate with multiple disbursement line items doesn't collide or error" do
    # Regression test: disbursement-based line items all have a nil task_id, so the
    # last_sent_snapshot/diff logic can't key on task_id alone without every disbursement row
    # colliding under the same nil key.
    bp = BusinessProfile.for_user(users(:admin))
    client = bp.clients.create!(name: "Client", email1: "client@example.com")
    project = Project.create!(name: "Project", client: client)
    project.disbursements.create!(description: "Travel", amount: 30)
    project.disbursements.create!(description: "Materials", amount: 20)

    estimate = EstimateGenerator.new(project: project).generate!
    estimate.pdf.attach(io: StringIO.new("fake pdf"), filename: "e.pdf", content_type: "application/pdf")

    post "/estimates/#{estimate.id}/send_estimate", headers: auth_headers(users(:admin))
    assert_response :success

    get "/estimates/#{estimate.id}", headers: auth_headers(users(:admin))
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 2, body["estimate_line_items"].size
  end
end
