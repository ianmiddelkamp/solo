class DecoupleInvoiceLineItemsFromTimeEntries < ActiveRecord::Migration[8.1]
  def up
    add_reference :time_entries, :invoice, null: true, foreign_key: true, index: true

    execute <<~SQL
      UPDATE time_entries SET invoice_id = ili.invoice_id
      FROM invoice_line_items ili WHERE ili.time_entry_id = time_entries.id
    SQL

    change_column_null :invoice_line_items, :time_entry_id, true
    add_reference :invoice_line_items, :project, null: true, foreign_key: true, index: true
    add_column :invoice_line_items, :kind, :string, null: false, default: "time"

    execute <<~SQL
      UPDATE invoice_line_items SET project_id = te.project_id
      FROM time_entries te WHERE te.id = invoice_line_items.time_entry_id
    SQL
  end

  def down
    remove_column :invoice_line_items, :kind
    remove_reference :invoice_line_items, :project, foreign_key: true, index: true
    change_column_null :invoice_line_items, :time_entry_id, false
    remove_reference :time_entries, :invoice, foreign_key: true, index: true
  end
end
