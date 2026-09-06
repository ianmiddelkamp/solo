class AddBillingConfigToProjects < ActiveRecord::Migration[8.1]
  def change
    add_column :projects, :billing_mode, :string, null: false, default: "hourly"
    add_column :projects, :billing_amount, :decimal, precision: 10, scale: 2
    add_column :projects, :show_task_breakdown, :boolean, null: false, default: true
    add_column :projects, :show_hours, :boolean, null: false, default: true
    add_column :projects, :show_actual_hours, :boolean, null: false, default: true
  end
end
