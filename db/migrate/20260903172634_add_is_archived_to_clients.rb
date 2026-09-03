class AddIsArchivedToClients < ActiveRecord::Migration[8.1]
  def change
    add_column :clients, :is_archived, :boolean, default: false, null: false
  end
end
