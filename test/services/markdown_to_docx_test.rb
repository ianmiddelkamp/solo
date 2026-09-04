require "test_helper"
require "docx"
require "tempfile"

class MarkdownToDocxTest < ActiveSupport::TestCase
  test "produces a docx that a standard reader can open, preserving text content" do
    markdown = <<~MD
      # Project Brief

      ## Overview
      This project is going well.

      - Risk one
      - Risk two
    MD

    bytes = MarkdownToDocx.convert(markdown)
    assert bytes.start_with?("PK"), "expected a zip (docx) payload"

    Tempfile.create(["test", ".docx"]) do |tmp|
      tmp.binmode
      tmp.write(bytes)
      tmp.flush

      paragraphs = Docx::Document.open(tmp.path).paragraphs.map(&:to_s)
      assert_includes paragraphs, "Project Brief"
      assert_includes paragraphs, "Overview"
      assert_includes paragraphs, "This project is going well."
      assert_includes paragraphs, "• Risk one"
    end
  end

  test "renders a markdown table as a real Word table" do
    markdown = <<~MD
      # Task Groups

      ## Backend

      | Task | Status |
      | --- | --- |
      | Write tests | To do |
      | Ship it | Done |
    MD

    bytes = MarkdownToDocx.convert(markdown)

    Tempfile.create(["test", ".docx"]) do |tmp|
      tmp.binmode
      tmp.write(bytes)
      tmp.flush

      doc = Docx::Document.open(tmp.path)
      assert_includes doc.paragraphs.map(&:to_s), "Backend"

      cells = doc.tables.flat_map { |t| t.rows.flat_map { |r| r.cells.map(&:text) } }
      assert_equal ["Task", "Status", "Write tests", "To do", "Ship it", "Done"], cells
    end
  end
end
