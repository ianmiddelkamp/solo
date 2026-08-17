require "test_helper"

class RoleTest < ActiveSupport::TestCase
  def client
    bp = BusinessProfile.create!(user: nil, name: "Business")
    bp.clients.create!(name: "Client")
  end

  test "requires a name" do
    role = Role.new(client: client)
    assert_not role.save
    assert_includes role.errors[:name], "can't be blank"
  end

  test "role names are unique per client, but not globally" do
    client_a = client
    client_b = client

    client_a.roles.create!(name: "Billing")
    dup = client_a.roles.new(name: "Billing")
    assert_not dup.save
    assert_includes dup.errors[:name], "has already been taken"

    # Same name on a different client is fine — roles are scoped per client, not global.
    assert client_b.roles.create!(name: "Billing").persisted?
  end

  test "a contact can have multiple roles" do
    c = client
    contact = c.contacts.create!(name: "Contact", primary: true)
    billing = c.roles.create!(name: "Billing")
    owner   = c.roles.create!(name: "Owner")

    contact.roles = [billing, owner]

    assert_equal [ "Billing", "Owner" ], contact.reload.roles.pluck(:name).sort
  end
end
