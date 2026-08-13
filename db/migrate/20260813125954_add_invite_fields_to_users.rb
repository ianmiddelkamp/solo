class AddInviteFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :invited_by_id, :bigint
    add_column :users, :invite_token, :string
    add_column :users, :invite_sent_at, :datetime
    add_column :users, :accepted_at, :datetime

    add_index :users, :invite_token, unique: true
    add_foreign_key :users, :users, column: :invited_by_id
  end
end
