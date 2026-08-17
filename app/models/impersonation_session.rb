class ImpersonationSession < ApplicationRecord
  belongs_to :impersonator, class_name: "User"
  belongs_to :user

  validates :started_at, presence: true

  def active?
    ended_at.nil?
  end

  def end!
    update!(ended_at: Time.current)
  end
end
