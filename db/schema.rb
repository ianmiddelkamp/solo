# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_07_27_161910) do
  create_schema "extensions"

  # These are extensions that must be enabled in order to support this database
  enable_extension "extensions.pg_stat_statements"
  enable_extension "extensions.pgcrypto"
  enable_extension "extensions.uuid-ossp"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vault.supabase_vault"

  create_table "public.active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "public.active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "public.active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "public.business_profiles", force: :cascade do |t|
    t.string "address1"
    t.string "address2"
    t.string "city"
    t.string "country"
    t.datetime "created_at", null: false
    t.string "default_payment_terms"
    t.string "email"
    t.text "estimate_footer"
    t.string "hst_number"
    t.text "invoice_footer"
    t.string "name"
    t.string "phone"
    t.string "postcode"
    t.string "primary_color", default: "#4338ca"
    t.string "state"
    t.decimal "tax_rate", precision: 5, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["user_id"], name: "index_business_profiles_on_user_id", unique: true
  end

  create_table "public.cca_assets", force: :cascade do |t|
    t.decimal "additions", precision: 10, scale: 2, default: "0.0"
    t.bigint "business_profile_id", null: false
    t.string "cca_class", null: false
    t.decimal "cca_rate", precision: 5, scale: 2, null: false
    t.decimal "cost", precision: 10, scale: 2, null: false
    t.datetime "created_at", null: false
    t.decimal "disposals", precision: 10, scale: 2, default: "0.0"
    t.string "name", null: false
    t.text "notes"
    t.date "purchase_date", null: false
    t.decimal "ucc_opening", precision: 10, scale: 2
    t.datetime "updated_at", null: false
    t.index ["business_profile_id"], name: "index_cca_assets_on_business_profile_id"
  end

  create_table "public.charge_codes", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "description"
    t.decimal "rate", precision: 10, scale: 2
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "code"], name: "index_charge_codes_on_user_id_and_code", unique: true
    t.index ["user_id"], name: "index_charge_codes_on_user_id"
  end

  create_table "public.clients", force: :cascade do |t|
    t.string "address1"
    t.string "address2"
    t.bigint "business_profile_id", null: false
    t.string "city"
    t.string "contact_name"
    t.string "country"
    t.datetime "created_at", null: false
    t.string "email1"
    t.string "email2"
    t.string "name", null: false
    t.string "phone1"
    t.string "phone2"
    t.string "postcode"
    t.string "sales_terms", default: "NET 15"
    t.string "state"
    t.datetime "updated_at", null: false
    t.index ["business_profile_id"], name: "index_clients_on_business_profile_id"
  end

  create_table "public.estimate_line_items", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.datetime "created_at", null: false
    t.string "description"
    t.bigint "estimate_id", null: false
    t.decimal "hours", precision: 5, scale: 2, null: false
    t.decimal "rate", precision: 8, scale: 2, null: false
    t.bigint "task_id"
    t.decimal "tax_rate", precision: 5, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index ["estimate_id"], name: "index_estimate_line_items_on_estimate_id"
    t.index ["task_id"], name: "index_estimate_line_items_on_task_id"
  end

  create_table "public.estimates", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "last_sent_snapshot"
    t.decimal "last_sent_total", precision: 10, scale: 2
    t.bigint "project_id", null: false
    t.string "status", default: "draft", null: false
    t.decimal "total", precision: 10, scale: 2
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_estimates_on_project_id"
  end

  create_table "public.expenses", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.bigint "business_profile_id", null: false
    t.string "category"
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.string "description", null: false
    t.decimal "hst_paid", precision: 10, scale: 2, default: "0.0", null: false
    t.text "notes"
    t.string "receipt_url"
    t.datetime "updated_at", null: false
    t.string "vendor"
    t.index ["business_profile_id"], name: "index_expenses_on_business_profile_id"
    t.index ["date"], name: "index_expenses_on_date"
  end

  create_table "public.home_office_profiles", force: :cascade do |t|
    t.bigint "business_profile_id", null: false
    t.datetime "created_at", null: false
    t.decimal "monthly_internet", precision: 10, scale: 2
    t.decimal "monthly_other", precision: 10, scale: 2
    t.decimal "monthly_rent", precision: 10, scale: 2
    t.decimal "monthly_utilities", precision: 10, scale: 2
    t.text "notes"
    t.integer "office_rooms"
    t.decimal "office_sqft", precision: 8, scale: 2
    t.integer "total_rooms"
    t.decimal "total_sqft", precision: 8, scale: 2
    t.datetime "updated_at", null: false
    t.boolean "use_square_footage", default: false, null: false
    t.index ["business_profile_id"], name: "index_home_office_profiles_on_business_profile_id", unique: true
  end

  create_table "public.hst_returns", force: :cascade do |t|
    t.decimal "amount_paid", precision: 12, scale: 2
    t.bigint "business_profile_id", null: false
    t.datetime "created_at", null: false
    t.datetime "filed_at"
    t.string "filing_reference"
    t.decimal "hst_collected", precision: 12, scale: 2
    t.decimal "input_tax_credits", precision: 12, scale: 2, default: "0.0"
    t.decimal "net_tax", precision: 12, scale: 2
    t.text "notes"
    t.datetime "paid_at"
    t.date "payment_due_date"
    t.date "period_end", null: false
    t.date "period_start", null: false
    t.string "status", default: "draft", null: false
    t.decimal "total_revenue", precision: 12, scale: 2
    t.datetime "updated_at", null: false
    t.index ["business_profile_id"], name: "index_hst_returns_on_business_profile_id"
  end

  create_table "public.invoice_line_items", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2
    t.datetime "created_at", null: false
    t.text "description"
    t.decimal "hours", precision: 5, scale: 2
    t.bigint "invoice_id", null: false
    t.decimal "rate", precision: 10, scale: 2
    t.decimal "tax_rate", precision: 5, scale: 2, default: "0.0", null: false
    t.bigint "time_entry_id", null: false
    t.datetime "updated_at", null: false
    t.index ["invoice_id"], name: "index_invoice_line_items_on_invoice_id"
    t.index ["time_entry_id"], name: "index_invoice_line_items_on_time_entry_id"
  end

  create_table "public.invoices", force: :cascade do |t|
    t.decimal "amount_paid", precision: 10, scale: 2
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.date "end_date"
    t.datetime "paid_at"
    t.string "pdf_url"
    t.date "start_date"
    t.string "status", default: "pending"
    t.decimal "total", precision: 10, scale: 2
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_invoices_on_client_id"
  end

  create_table "public.projects", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "is_archived", default: false, null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_projects_on_client_id"
  end

  create_table "public.rates", force: :cascade do |t|
    t.bigint "client_id"
    t.datetime "created_at", null: false
    t.bigint "project_id"
    t.decimal "rate", precision: 10, scale: 2, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["client_id"], name: "index_rates_on_client_id"
    t.index ["project_id"], name: "index_rates_on_project_id"
    t.index ["user_id"], name: "index_rates_on_user_id"
  end

  create_table "public.task_groups", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "position"
    t.bigint "project_id", null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_task_groups_on_project_id"
  end

  create_table "public.tasks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "estimated_hours", precision: 5, scale: 2
    t.integer "position"
    t.string "status"
    t.bigint "task_group_id", null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.index ["task_group_id"], name: "index_tasks_on_task_group_id"
  end

  create_table "public.time_entries", force: :cascade do |t|
    t.bigint "charge_code_id"
    t.bigint "client_id"
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.text "description"
    t.decimal "hours", precision: 5, scale: 2, null: false
    t.bigint "project_id"
    t.datetime "started_at"
    t.datetime "stopped_at"
    t.bigint "task_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["charge_code_id"], name: "index_time_entries_on_charge_code_id"
    t.index ["client_id"], name: "index_time_entries_on_client_id"
    t.index ["project_id"], name: "index_time_entries_on_project_id"
    t.index ["task_id"], name: "index_time_entries_on_task_id"
    t.index ["user_id"], name: "index_time_entries_on_user_id"
  end

  create_table "public.timer_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "description"
    t.bigint "project_id", null: false
    t.datetime "started_at", null: false
    t.datetime "stopped_at"
    t.bigint "task_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["project_id"], name: "index_timer_sessions_on_project_id"
    t.index ["task_id"], name: "index_timer_sessions_on_task_id"
    t.index ["user_id"], name: "index_timer_sessions_on_user_id"
  end

  create_table "public.users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.string "password_digest"
    t.string "role"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "public.active_storage_attachments", "public.active_storage_blobs", column: "blob_id"
  add_foreign_key "public.active_storage_variant_records", "public.active_storage_blobs", column: "blob_id"
  add_foreign_key "public.business_profiles", "public.users"
  add_foreign_key "public.cca_assets", "public.business_profiles"
  add_foreign_key "public.charge_codes", "public.users"
  add_foreign_key "public.clients", "public.business_profiles"
  add_foreign_key "public.estimate_line_items", "public.estimates"
  add_foreign_key "public.estimate_line_items", "public.tasks", on_delete: :nullify
  add_foreign_key "public.estimates", "public.projects"
  add_foreign_key "public.expenses", "public.business_profiles"
  add_foreign_key "public.home_office_profiles", "public.business_profiles"
  add_foreign_key "public.hst_returns", "public.business_profiles"
  add_foreign_key "public.invoice_line_items", "public.invoices"
  add_foreign_key "public.invoice_line_items", "public.time_entries"
  add_foreign_key "public.invoices", "public.clients"
  add_foreign_key "public.projects", "public.clients"
  add_foreign_key "public.rates", "public.clients"
  add_foreign_key "public.rates", "public.projects"
  add_foreign_key "public.rates", "public.users"
  add_foreign_key "public.task_groups", "public.projects"
  add_foreign_key "public.tasks", "public.task_groups"
  add_foreign_key "public.time_entries", "public.charge_codes"
  add_foreign_key "public.time_entries", "public.clients"
  add_foreign_key "public.time_entries", "public.projects"
  add_foreign_key "public.time_entries", "public.tasks"
  add_foreign_key "public.time_entries", "public.users"
  add_foreign_key "public.timer_sessions", "public.projects"
  add_foreign_key "public.timer_sessions", "public.tasks", on_delete: :nullify
  add_foreign_key "public.timer_sessions", "public.users"

end
