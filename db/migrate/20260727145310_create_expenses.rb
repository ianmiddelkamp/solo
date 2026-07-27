class CreateExpenses < ActiveRecord::Migration[8.1]
  def change
    create_table :expenses do |t|
      t.bigint :business_profile_id, null: false
      t.date :date, null: false
      t.string :vendor
      t.string :description, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.decimal :hst_paid, precision: 10, scale: 2, default: "0.0", null: false
      t.string :category
      t.string :receipt_url
      t.text :notes

      t.timestamps
    end

    add_index :expenses, :business_profile_id
    add_index :expenses, :date
    add_foreign_key :expenses, :business_profiles
  end
end
