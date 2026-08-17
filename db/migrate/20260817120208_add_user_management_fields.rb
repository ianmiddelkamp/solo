class AddUserManagementFields < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :archived_at, :datetime
    add_column :users, :last_login_at, :datetime
    add_column :users, :reset_password_token, :string
    add_column :users, :reset_password_sent_at, :datetime
    add_index :users, :reset_password_token, unique: true

    create_table :impersonation_sessions do |t|
      t.references :impersonator, null: false, foreign_key: { to_table: :users }
      t.references :user, null: false, foreign_key: { to_table: :users }
      t.datetime :started_at, null: false
      t.datetime :ended_at

      t.timestamps
    end
  end
end
