class ExpensesController < ApplicationController
  before_action :set_business_profile
  before_action :set_expense, only: [:show, :update, :destroy, :receipt]

  def index
    scope = @business_profile.expenses.order(date: :desc)
    scope = scope.in_period(params[:start], params[:end]) if params[:start].present? && params[:end].present?
    scope = scope.where(category: params[:category]) if params[:category].present?
    render json: scope.map { |e| expense_json(e) }
  end

  def show
    render json: expense_json(@expense)
  end

  def create
    @expense = @business_profile.expenses.new(expense_params)
    attach_receipt_blob(@expense)
    if @expense.save
      render json: expense_json(@expense), status: :created
    else
      render json: { errors: @expense.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    attach_receipt_blob(@expense)
    if @expense.update(expense_params)
      render json: expense_json(@expense)
    else
      render json: { errors: @expense.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @expense.destroy
    head :no_content
  end

  def parse_receipt
    file = params[:file]
    return render json: { error: "No file provided" }, status: :unprocessable_entity unless file

    pdf_data = file.read

    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new(pdf_data),
      filename: file.original_filename,
      content_type: "application/pdf"
    )

    parsed = ReceiptParser.new(pdf_data).parse
    render json: parsed.merge("receipt_blob_signed_id" => blob.signed_id)
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def receipt
    return head :not_found unless @expense.receipt.attached?
    blob = @expense.receipt.blob
    send_data blob.download,
      filename: blob.filename.to_s,
      content_type: "application/pdf",
      disposition: "inline"
  end

  private

  def set_business_profile
    @business_profile = BusinessProfile.for_user(@current_user)
  end

  def set_expense
    @expense = @business_profile.expenses.find(params[:id])
  end

  def expense_params
    params.require(:expense).permit(:date, :vendor, :description, :amount, :hst_paid, :category, :receipt_url, :notes)
  end

  def attach_receipt_blob(expense)
    signed_id = params[:receipt_blob_signed_id]
    return unless signed_id.present?
    blob = ActiveStorage::Blob.find_signed!(signed_id)
    expense.receipt.attach(blob)
  rescue ActiveSupport::MessageVerifier::InvalidSignature
    # ignore invalid signed IDs
  end

  def expense_json(expense)
    expense.as_json.merge(
      "receipt_blob_id" => expense.receipt.attached? ? expense.receipt.blob.id : nil
    )
  end
end
