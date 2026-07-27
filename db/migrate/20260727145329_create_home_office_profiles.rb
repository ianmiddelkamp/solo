class CreateHomeOfficeProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :home_office_profiles do |t|
      t.bigint :business_profile_id, null: false
      t.integer :total_rooms
      t.integer :office_rooms
      t.decimal :monthly_rent, precision: 10, scale: 2
      t.decimal :monthly_utilities, precision: 10, scale: 2
      t.decimal :monthly_internet, precision: 10, scale: 2
      t.decimal :monthly_other, precision: 10, scale: 2
      t.boolean :use_square_footage, default: false, null: false
      t.decimal :total_sqft, precision: 8, scale: 2
      t.decimal :office_sqft, precision: 8, scale: 2
      t.text :notes

      t.timestamps
    end

    add_index :home_office_profiles, :business_profile_id, unique: true
    add_foreign_key :home_office_profiles, :business_profiles
  end
end
