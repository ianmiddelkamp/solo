class CreateHstReturns < ActiveRecord::Migration[8.1]
  def change
    create_table :hst_returns do |t|
      t.bigint :business_profile_id, null: false
      t.date :period_start, null: false
      t.date :period_end, null: false
      t.string :status, default: "draft", null: false
      t.decimal :total_revenue, precision: 12, scale: 2
      t.decimal :hst_collected, precision: 12, scale: 2
      t.decimal :input_tax_credits, precision: 12, scale: 2, default: "0.0"
      t.decimal :net_tax, precision: 12, scale: 2
      t.string :filing_reference
      t.datetime :filed_at
      t.date :payment_due_date
      t.datetime :paid_at
      t.decimal :amount_paid, precision: 12, scale: 2
      t.text :notes

      t.timestamps
    end

    add_index :hst_returns, :business_profile_id
    add_foreign_key :hst_returns, :business_profiles
  end
end
