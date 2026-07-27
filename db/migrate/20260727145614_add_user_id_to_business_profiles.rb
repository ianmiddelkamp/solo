class AddUserIdToBusinessProfiles < ActiveRecord::Migration[8.1]
  def change
    add_column :business_profiles, :user_id, :bigint
    add_index :business_profiles, :user_id, unique: true
    add_foreign_key :business_profiles, :users
  end
end
