class AddGmailCredentialsToBusinessProfiles < ActiveRecord::Migration[8.1]
  def change
    add_column :business_profiles, :gmail_user, :string
    add_column :business_profiles, :gmail_app_password, :text
  end
end
