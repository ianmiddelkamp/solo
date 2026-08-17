class EstimateMailer < ApplicationMailer
  def estimate_email(estimate, changes = nil, contact = nil)
    @estimate = estimate
    @client   = estimate.project.client
    @contact  = contact || estimate.contact
    @project  = estimate.project
    @business = @client.business_profile
    @items    = estimate.estimate_line_items.includes(task: [:task_group, :time_entries]).order("estimate_line_items.id ASC")
    @changes  = changes

    attachments["#{@estimate.number}.pdf"] = {
      mime_type: "application/pdf",
      content: @estimate.pdf.download
    }

    if @business.logo.attached?
      attachments.inline["logo"] = {
        data:      @business.logo.download,
        mime_type: @business.logo.content_type
      }
    end

    deliver_mail(
      to:      @contact.email,
      subject: "Estimate #{estimate.number} from #{@business.name.presence || 'us'}"
    )
  end
end
