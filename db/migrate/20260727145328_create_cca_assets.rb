class CreateCcaAssets < ActiveRecord::Migration[8.1]
  def change
    create_table :cca_assets do |t|
      t.bigint :business_profile_id, null: false
      t.string :name, null: false
      t.string :cca_class, null: false
      t.decimal :cca_rate, precision: 5, scale: 2, null: false
      t.date :purchase_date, null: false
      t.decimal :cost, precision: 10, scale: 2, null: false
      t.decimal :ucc_opening, precision: 10, scale: 2
      t.decimal :additions, precision: 10, scale: 2, default: "0.0"
      t.decimal :disposals, precision: 10, scale: 2, default: "0.0"
      t.text :notes

      t.timestamps
    end

    add_index :cca_assets, :business_profile_id
    add_foreign_key :cca_assets, :business_profiles
  end
end
