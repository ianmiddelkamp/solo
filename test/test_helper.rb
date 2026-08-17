ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...

    # PdfRenderer shells out to a real headless Chromium (see app/services/pdf_renderer.rb),
    # which isn't installed in every environment this suite runs in. Existing tests worked
    # around this by never exercising a controller action that generates a real PDF — this
    # gives tests that DO need to hit that code path (e.g. the real create action, not just the
    # generator service) a way to swap in a fake renderer for the test's duration.
    def stub_pdf_rendering
      original = PdfRenderer.instance_method(:render_to_pdf)
      PdfRenderer.define_method(:render_to_pdf) { |_html| "%PDF-1.4 fake pdf content" }
      yield
    ensure
      PdfRenderer.define_method(:render_to_pdf, original)
    end
  end
end
