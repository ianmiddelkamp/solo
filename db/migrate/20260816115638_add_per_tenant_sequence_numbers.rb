class AddPerTenantSequenceNumbers < ActiveRecord::Migration[8.1]
  def up
    add_column :invoices, :sequence_number, :integer
    add_column :estimates, :sequence_number, :integer
    add_column :business_profiles, :next_invoice_number, :integer, null: false, default: 1
    add_column :business_profiles, :next_estimate_number, :integer, null: false, default: 1

    # Backfill: preserve exactly what's currently displayed for every existing record
    # (Invoice#number/Estimate#number used to be "INV-#{id}"/"EST-#{id}"), so nothing anyone
    # has already seen changes.
    execute <<~SQL.squish
      UPDATE invoices SET sequence_number = id WHERE sequence_number IS NULL;
    SQL
    execute <<~SQL.squish
      UPDATE estimates SET sequence_number = id WHERE sequence_number IS NULL;
    SQL

    change_column_null :invoices, :sequence_number, false
    change_column_null :estimates, :sequence_number, false

    # Seed each business's counter to continue past its own existing max, so the next
    # invoice/estimate it creates doesn't collide with anything already issued.
    execute <<~SQL.squish
      UPDATE business_profiles bp
      SET next_invoice_number = COALESCE((
        SELECT MAX(invoices.sequence_number) + 1
        FROM invoices
        JOIN clients ON clients.id = invoices.client_id
        WHERE clients.business_profile_id = bp.id
      ), 1)
    SQL
    execute <<~SQL.squish
      UPDATE business_profiles bp
      SET next_estimate_number = COALESCE((
        SELECT MAX(estimates.sequence_number) + 1
        FROM estimates
        JOIN projects ON projects.id = estimates.project_id
        JOIN clients ON clients.id = projects.client_id
        WHERE clients.business_profile_id = bp.id
      ), 1)
    SQL

    add_index :invoices, [:client_id, :sequence_number]
    add_index :estimates, [:project_id, :sequence_number]
  end

  def down
    remove_index :invoices, [:client_id, :sequence_number]
    remove_index :estimates, [:project_id, :sequence_number]
    remove_column :business_profiles, :next_invoice_number
    remove_column :business_profiles, :next_estimate_number
    remove_column :invoices, :sequence_number
    remove_column :estimates, :sequence_number
  end
end
