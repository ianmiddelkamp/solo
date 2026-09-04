require "zip"

# Converts a small subset of Markdown (headings, bullet lines, tables, plain paragraphs) into a
# minimal but valid .docx, built by hand as a zip of OOXML parts. The "docx" gem elsewhere in this
# app only supports opening/editing an *existing* .docx, not creating one from scratch, so this
# hand-rolls the handful of parts Word actually requires — no extra gem beyond rubyzip, which is
# already pulled in transitively.
module MarkdownToDocx
  module_function

  CONTENT_TYPES = <<~XML
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    </Types>
  XML

  PACKAGE_RELS = <<~XML
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>
  XML

  DOCUMENT_RELS = <<~XML
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>
  XML

  STYLES = <<~XML
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:docDefaults/>
    </w:styles>
  XML

  def convert(markdown)
    buffer = Zip::OutputStream.write_buffer do |zip|
      zip.put_next_entry("[Content_Types].xml")
      zip.write(CONTENT_TYPES)
      zip.put_next_entry("_rels/.rels")
      zip.write(PACKAGE_RELS)
      zip.put_next_entry("word/_rels/document.xml.rels")
      zip.write(DOCUMENT_RELS)
      zip.put_next_entry("word/styles.xml")
      zip.write(STYLES)
      zip.put_next_entry("word/document.xml")
      zip.write(document_xml(markdown.to_s))
    end
    buffer.string
  end

  def document_xml(markdown)
    lines = markdown.each_line.map(&:chomp)
    body = blocks_xml(lines)

    <<~XML
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          #{body}
          <w:sectPr/>
        </w:body>
      </w:document>
    XML
  end

  TABLE_ROW = /\A\s*\|.*\|\s*\z/
  TABLE_SEPARATOR_CELL = /\A:?-+:?\z/

  # Groups consecutive "| a | b |" lines into a single table block; everything else stays a
  # paragraph-per-line, same as before tables were supported.
  def blocks_xml(lines)
    xml = +""
    i = 0
    while i < lines.length
      if lines[i].match?(TABLE_ROW)
        table_lines = []
        while i < lines.length && lines[i].match?(TABLE_ROW)
          table_lines << lines[i]
          i += 1
        end
        xml << table_xml(table_lines)
      else
        xml << paragraph_xml(lines[i])
        i += 1
      end
    end
    xml
  end

  def table_xml(table_lines)
    rows = table_lines.map { |line| line.strip.delete_prefix("|").delete_suffix("|").split("|").map(&:strip) }
    rows.reject! { |cells| cells.all? { |c| c.match?(TABLE_SEPARATOR_CELL) } }
    return "" if rows.empty?

    body_rows = rows.map { |cells| table_row_xml(cells) }.join
    "<w:tbl>#{TABLE_PROPERTIES}#{body_rows}</w:tbl>"
  end

  TABLE_PROPERTIES = <<~XML.strip
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>
        <w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>
        <w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>
      </w:tblBorders>
    </w:tblPr>
  XML

  def table_row_xml(cells)
    "<w:tr>#{cells.map { |c| table_cell_xml(c) }.join}</w:tr>"
  end

  def table_cell_xml(text)
    "<w:tc><w:p><w:r><w:t xml:space=\"preserve\">#{escape(text)}</w:t></w:r></w:p></w:tc>"
  end

  def paragraph_xml(line)
    if line.strip.empty?
      "<w:p/>"
    elsif line.start_with?("### ")
      heading_xml(line.delete_prefix("### "), 24)
    elsif line.start_with?("## ")
      heading_xml(line.delete_prefix("## "), 28)
    elsif line.start_with?("# ")
      heading_xml(line.delete_prefix("# "), 32)
    elsif line.start_with?("- ", "* ")
      run_xml("• #{escape(line[2..])}")
    else
      run_xml(escape(line))
    end
  end

  def heading_xml(text, size)
    "<w:p><w:pPr><w:spacing w:before=\"240\" w:after=\"120\"/></w:pPr>" \
    "<w:r><w:rPr><w:b/><w:sz w:val=\"#{size}\"/></w:rPr>" \
    "<w:t xml:space=\"preserve\">#{escape(text)}</w:t></w:r></w:p>"
  end

  def run_xml(escaped_text)
    "<w:p><w:r><w:t xml:space=\"preserve\">#{escaped_text}</w:t></w:r></w:p>"
  end

  def escape(text)
    text.to_s.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
  end
end
