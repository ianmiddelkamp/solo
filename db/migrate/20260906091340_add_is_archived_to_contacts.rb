class AddIsArchivedToContacts < ActiveRecord::Migration[8.1]
  def change
    add_column :contacts, :is_archived, :boolean, default: false, null: false
  end
end
