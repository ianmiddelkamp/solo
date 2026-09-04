require "csv"

# Builds CSV, Markdown-table, and XLSX output from a plain headers/rows table shape, shared by
# every list-export endpoint (time entries, invoices, ...) so each controller only has to build
# the headers/rows once and pick a format.
module TableExport
  module_function

  def csv(headers, rows)
    CSV.generate do |csv|
      csv << headers
      rows.each { |row| csv << row }
    end
  end

  def markdown(title, headers, rows)
    lines = ["# #{title}", "", row_line(headers), row_line(headers.map { "---" })]
    rows.each { |row| lines << row_line(row) }
    lines.join("\n")
  end

  def xlsx(sheet_name, headers, rows)
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: sheet_name) do |sheet|
      sheet.add_row headers
      rows.each { |row| sheet.add_row row }
    end
    package.to_stream.read
  end

  def row_line(cells)
    "| #{cells.map { |c| escape_markdown(c) }.join(' | ')} |"
  end
  private_class_method :row_line

  def escape_markdown(value)
    value.to_s.gsub("|", "\\|").gsub("\n", " ")
  end
  private_class_method :escape_markdown
end
