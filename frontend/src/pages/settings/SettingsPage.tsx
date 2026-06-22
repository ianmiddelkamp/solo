import { useEffect, useRef, useState } from 'react';
import { getBusinessProfile, updateBusinessProfile, uploadBusinessLogo, deleteBusinessLogo } from '../../api/businessProfile';
import { confirm } from '../../services/dialog';

const PAYMENT_TERMS = ['NET 15', 'NET 30', 'NET 45', 'NET 60', 'Due on Receipt'];

const EMPTY = {
  name: '', email: '', phone: '',
  address1: '', address2: '', city: '', state: '', postcode: '', country: '',
  hst_number: '', primary_color: '#4338ca',
  invoice_footer: '', estimate_footer: '', default_payment_terms: '',
  tax_rate: '',
};

type FormState = typeof EMPTY;

interface FieldProps {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}

function Field({ label, name, value, onChange, type = 'text', placeholder, hint }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

interface TextAreaProps {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

function TextArea({ label, name, value, onChange, placeholder, hint, rows = 3 }: TextAreaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getBusinessProfile()
      .then((p) => {
        if (!p) return;
        setForm({
          name:                  p.name                  ?? '',
          email:                 p.email                 ?? '',
          phone:                 p.phone                 ?? '',
          address1:              p.address1              ?? '',
          address2:              p.address2              ?? '',
          city:                  p.city                  ?? '',
          state:                 p.state                 ?? '',
          postcode:              p.postcode              ?? '',
          country:               p.country               ?? '',
          hst_number:            p.hst_number            ?? '',
          primary_color:         p.primary_color         ?? '#4338ca',
          invoice_footer:        p.invoice_footer        ?? '',
          estimate_footer:       p.estimate_footer       ?? '',
          default_payment_terms: p.default_payment_terms ?? '',
          tax_rate:              p.tax_rate              ?? '',
        });
        setLogoDataUri(p.logo_data_uri || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const res = await uploadBusinessLogo(file);
      setLogoDataUri(res.logo_data_uri ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    if (!await confirm('Remove the business logo?')) return;
    try {
      await deleteBusinessLogo();
      setLogoDataUri(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateBusinessProfile(form);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Business Settings</h2>
        <p className="text-sm text-gray-500 mt-1">This information appears on your invoices and estimates.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">Settings saved.</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Business</h3>
          <div className="space-y-4">
            <Field label="Business Name" name="name" value={form.name} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
              <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" />
            </div>
            <Field
              label="HST Number"
              name="hst_number"
              value={form.hst_number}
              onChange={handleChange}
              placeholder="e.g. 123456789 RT0001"
              hint="Optional — printed on invoices when provided."
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Address</h3>
          <div className="space-y-3">
            <Field label="Street Address" name="address1" value={form.address1} onChange={handleChange} />
            <Field label="Address Line 2" name="address2" value={form.address2} onChange={handleChange} placeholder="Suite, unit, etc." />
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" name="city" value={form.city} onChange={handleChange} />
              <Field label="Province / State" name="state" value={form.state} onChange={handleChange} />
              <Field label="Postcode" name="postcode" value={form.postcode} onChange={handleChange} />
              <Field label="Country" name="country" value={form.country} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Document Styling</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              {logoDataUri ? (
                <div className="flex items-center gap-4">
                  <img src={logoDataUri} alt="Business logo" className="max-h-16 max-w-40 object-contain border border-gray-200 rounded p-1" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Replace
                    </button>
                    <button type="button" onClick={handleRemoveLogo} className="text-xs text-red-500 hover:text-red-700 font-medium">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
                >
                  {uploadingLogo ? 'Uploading…' : '+ Upload logo'}
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
              <p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG — shown in place of the document type label when set.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="primary_color"
                  value={form.primary_color}
                  onChange={handleChange}
                  className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="primary_color"
                  value={form.primary_color}
                  onChange={handleChange}
                  placeholder="#4338ca"
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-400">Used for headers and accents on all documents.</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Document Options</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Payment Terms</label>
              <select
                name="default_payment_terms"
                value={form.default_payment_terms}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select terms…</option>
                {PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Used when a client has no specific terms set.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="tax_rate"
                  value={form.tax_rate}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Stamped on each line item at generation time. Set to 0 to disable tax.</p>
            </div>

            <TextArea
              label="Invoice Footer"
              name="invoice_footer"
              value={form.invoice_footer}
              onChange={handleChange}
              placeholder="Thank you for your business."
              hint="Appears at the bottom of invoices. Leave blank for the default."
            />

            <TextArea
              label="Estimate Footer"
              name="estimate_footer"
              value={form.estimate_footer}
              onChange={handleChange}
              placeholder="This is an estimate only. The final invoice may vary based on actual hours worked."
              hint="Appears at the bottom of estimates. Leave blank for the default."
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
