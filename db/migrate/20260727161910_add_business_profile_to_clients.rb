class AddBusinessProfileToClients < ActiveRecord::Migration[8.1]
  def change
    add_reference :clients, :business_profile, null: true, foreign_key: true
    reversible do |dir|
      dir.up { execute "UPDATE clients SET business_profile_id = (SELECT id FROM business_profiles LIMIT 1)" }
    end
    change_column_null :clients, :business_profile_id, false
  end
end
