class CreateContacts < ActiveRecord::Migration[8.1]
  def up
    create_table :contacts do |t|
      t.references :client, null: false, foreign_key: true
      t.string :name, null: false
      t.string :email
      t.string :phone
      t.string :phone2
      t.boolean :primary, null: false, default: false

      t.timestamps
    end
    add_index :contacts, :client_id, unique: true, where: "\"primary\"", name: "index_contacts_on_client_id_one_primary"

    # Roles are freeform tags, scoped per client (not a fixed global enum — two different
    # clients can each have their own "Billing"/"Owner"/whatever set), and a contact can carry
    # more than one at once. Kept entirely independent of `primary` above — a contact's primary
    # status and its roles are two separate concepts.
    create_table :roles do |t|
      t.references :client, null: false, foreign_key: true
      t.string :name, null: false

      t.timestamps
    end
    add_index :roles, [:client_id, :name], unique: true

    create_table :contact_roles do |t|
      t.references :contact, null: false, foreign_key: true
      t.references :role, null: false, foreign_key: true

      t.timestamps
    end
    add_index :contact_roles, [:contact_id, :role_id], unique: true

    # Every existing client's flat contact fields become that client's primary contact.
    # email2 is deliberately dropped, not preserved — decided explicitly, not an oversight.
    execute <<~SQL.squish
      INSERT INTO contacts (client_id, name, email, phone, phone2, "primary", created_at, updated_at)
      SELECT id,
             COALESCE(NULLIF(contact_name, ''), name),
             NULLIF(email1, ''),
             NULLIF(phone1, ''),
             NULLIF(phone2, ''),
             true,
             now(),
             now()
      FROM clients
    SQL

    add_reference :estimates, :contact, foreign_key: true
    add_reference :invoices, :contact, foreign_key: true

    execute <<~SQL.squish
      UPDATE estimates
      SET contact_id = contacts.id
      FROM projects, clients, contacts
      WHERE estimates.project_id = projects.id
        AND projects.client_id = clients.id
        AND contacts.client_id = clients.id
        AND contacts."primary" = true
    SQL
    execute <<~SQL.squish
      UPDATE invoices
      SET contact_id = contacts.id
      FROM contacts
      WHERE invoices.client_id = contacts.client_id
        AND contacts."primary" = true
    SQL

    change_column_null :estimates, :contact_id, false
    change_column_null :invoices, :contact_id, false

    remove_column :clients, :contact_name, :string
    remove_column :clients, :email1, :string
    remove_column :clients, :email2, :string
    remove_column :clients, :phone1, :string
    remove_column :clients, :phone2, :string
  end

  def down
    add_column :clients, :contact_name, :string
    add_column :clients, :email1, :string
    add_column :clients, :email2, :string
    add_column :clients, :phone1, :string
    add_column :clients, :phone2, :string

    execute <<~SQL.squish
      UPDATE clients
      SET contact_name = contacts.name, email1 = contacts.email,
          phone1 = contacts.phone, phone2 = contacts.phone2
      FROM contacts
      WHERE contacts.client_id = clients.id AND contacts."primary" = true
    SQL

    remove_reference :estimates, :contact, foreign_key: true
    remove_reference :invoices, :contact, foreign_key: true
    drop_table :contact_roles
    drop_table :roles
    drop_table :contacts
  end
end
