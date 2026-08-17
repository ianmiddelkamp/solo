class ContactRole < ApplicationRecord
  belongs_to :contact
  belongs_to :role
end
