class AddTaskToInvoiceLineItems < ActiveRecord::Migration[8.1]
  def change
    add_reference :invoice_line_items, :task, null: true, foreign_key: true, index: true
  end
end
