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

  # Regression test for a real corruption bug: rubyzip defaults to writing Zip64 extension
  # headers even for tiny archives, which more lenient readers (including the docx gem used
  # elsewhere in this file) tolerate, but real Microsoft Word's zip reader rejects as corrupted.
  # A docx this small should never need Zip64 — assert the local file headers carry real sizes,
  # not the 0xFFFFFFFF sentinel Zip64 uses as a placeholder.
  test "does not use Zip64 extension headers for a small document" do
    bytes = MarkdownToDocx.convert("# Small doc\n\nJust one line.\n")

    offset = 0
    entries_checked = 0
    while offset < bytes.bytesize - 4
      if bytes[offset, 4] == "PK\x03\x04"
        comp_size = bytes[offset + 18, 4].unpack1("V")
        uncomp_size = bytes[offset + 22, 4].unpack1("V")
        name_len = bytes[offset + 26, 2].unpack1("v")
        extra_len = bytes[offset + 28, 2].unpack1("v")

        refute_equal 0xFFFFFFFF, comp_size, "local file header used the Zip64 compressed-size sentinel"
        refute_equal 0xFFFFFFFF, uncomp_size, "local file header used the Zip64 uncompressed-size sentinel"
        entries_checked += 1

        offset += 30 + name_len + extra_len + comp_size
      else
        offset += 1
      end
    end

    assert_equal 5, entries_checked, "expected to find all 5 OOXML parts in the zip"
  end

  test "restores the app-wide Zip.write_zip64_support setting after converting" do
    original = Zip.write_zip64_support
    Zip.write_zip64_support = true

    MarkdownToDocx.convert("# Doc\n")

    assert_equal true, Zip.write_zip64_support
  ensure
    Zip.write_zip64_support = original
  end
end
