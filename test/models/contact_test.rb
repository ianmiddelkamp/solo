require "test_helper"

class ContactTest < ActiveSupport::TestCase
  def client
    bp = BusinessProfile.create!(user: nil, name: "Business")
    bp.clients.create!(name: "Client")
  end

  test "requires a name" do
    contact = Contact.new(client: client)
    assert_not contact.save
    assert_includes contact.errors[:name], "can't be blank"
  end

  test "setting a contact primary unsets the client's other primary contact" do
    c = client
    first = c.contacts.create!(name: "First", primary: true)
    second = c.contacts.create!(name: "Second")

    second.update!(primary: true)

    assert_not first.reload.primary?
    assert second.reload.primary?
  end

  test "Client#primary_contact returns the primary contact" do
    c = client
    c.contacts.create!(name: "Not primary")
    primary = c.contacts.create!(name: "Primary", primary: true)

    assert_equal primary, c.primary_contact
  end
end
