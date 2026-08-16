class CreateDisbursements < ActiveRecord::Migration[8.1]
  def change
    create_table :disbursements do |t|
      t.references :project, null: false, foreign_key: true
      t.string :description, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.date :incurred_on
      t.boolean :paid, null: false, default: false

      t.timestamps
    end

    add_reference :estimate_line_items, :disbursement, null: true, foreign_key: true
  end
end
