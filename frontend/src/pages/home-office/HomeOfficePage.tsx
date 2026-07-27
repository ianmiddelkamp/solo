import { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { getHomeOfficeProfile, updateHomeOfficeProfile } from '../../api/homeOffice';
import type { HomeOfficeProfile } from '../../types';

type FormState = {
  use_square_footage: boolean;
  total_rooms: string;
  office_rooms: string;
  total_sqft: string;
  office_sqft: string;
  monthly_rent: string;
  monthly_utilities: string;
  monthly_internet: string;
  monthly_other: string;
  notes: string;
};

function fmt(n: number) { return `$${n.toFixed(2)}`; }

function profileToForm(p: HomeOfficeProfile | null): FormState {
  return {
    use_square_footage: p?.use_square_footage ?? false,
    total_rooms: p?.total_rooms != null ? String(p.total_rooms) : '',
    office_rooms: p?.office_rooms != null ? String(p.office_rooms) : '',
    total_sqft: p?.total_sqft != null ? String(p.total_sqft) : '',
    office_sqft: p?.office_sqft != null ? String(p.office_sqft) : '',
    monthly_rent: p?.monthly_rent != null ? String(p.monthly_rent) : '',
    monthly_utilities: p?.monthly_utilities != null ? String(p.monthly_utilities) : '',
    monthly_internet: p?.monthly_internet != null ? String(p.monthly_internet) : '',
    monthly_other: p?.monthly_other != null ? String(p.monthly_other) : '',
    notes: p?.notes ?? '',
  };
}

export default function HomeOfficePage() {
  const [profile, setProfile] = useState<HomeOfficeProfile | null>(null);
  const [form, setForm] = useState<FormState>(profileToForm(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getHomeOfficeProfile().then(data => {
      setProfile(data);
      setForm(profileToForm(data));
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
    setSaved(false);
  }

  // Live preview calculation
  const useSqft = form.use_square_footage;
  const pct = useSqft
    ? (parseFloat(form.office_sqft) || 0) / (parseFloat(form.total_sqft) || 1) * 100
    : (parseFloat(form.office_rooms) || 0) / (parseFloat(form.total_rooms) || 1) * 100;
  const monthlyTotal = (parseFloat(form.monthly_rent) || 0) + (parseFloat(form.monthly_utilities) || 0) +
    (parseFloat(form.monthly_internet) || 0) + (parseFloat(form.monthly_other) || 0);
  const annualDeductible = monthlyTotal * 12 * pct / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        use_square_footage: form.use_square_footage,
        total_rooms: form.total_rooms !== '' ? parseInt(form.total_rooms) : null,
        office_rooms: form.office_rooms !== '' ? parseInt(form.office_rooms) : null,
        total_sqft: form.total_sqft !== '' ? parseFloat(form.total_sqft) : null,
        office_sqft: form.office_sqft !== '' ? parseFloat(form.office_sqft) : null,
        monthly_rent: form.monthly_rent !== '' ? parseFloat(form.monthly_rent) : null,
        monthly_utilities: form.monthly_utilities !== '' ? parseFloat(form.monthly_utilities) : null,
        monthly_internet: form.monthly_internet !== '' ? parseFloat(form.monthly_internet) : null,
        monthly_other: form.monthly_other !== '' ? parseFloat(form.monthly_other) : null,
        notes: form.notes.trim() || null,
      };
      const updated = await updateHomeOfficeProfile(payload);
      if (updated) { setProfile(updated); setSaved(true); }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Home Office" />
      <p className="text-sm text-gray-500 mb-6">
        Calculate your deductible home office expense for T2125 Part 7. CRA allows either a room-count or square-footage method.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">Saved.</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Method</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="use_square_footage" checked={form.use_square_footage} onChange={handleChange}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-gray-700">Use square footage instead of room count</span>
          </label>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {useSqft ? 'Square Footage' : 'Room Count'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {useSqft ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Home (sq ft)</label>
                  <input type="number" name="total_sqft" value={form.total_sqft} onChange={handleChange} min="0" step="1"
                    className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Office Space (sq ft)</label>
                  <input type="number" name="office_sqft" value={form.office_sqft} onChange={handleChange} min="0" step="1"
                    className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Rooms</label>
                  <input type="number" name="total_rooms" value={form.total_rooms} onChange={handleChange} min="1" step="1"
                    className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Office Rooms</label>
                  <input type="number" name="office_rooms" value={form.office_rooms} onChange={handleChange} min="1" step="1"
                    className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Home Costs</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'monthly_rent', label: 'Rent / Mortgage interest' },
              { name: 'monthly_utilities', label: 'Heat, electricity, water' },
              { name: 'monthly_internet', label: 'Internet' },
              { name: 'monthly_other', label: 'Other' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type="number" name={f.name} value={(form as any)[f.name]} onChange={handleChange} min="0" step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Business use %</span>
            <span className="font-semibold">{pct.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total monthly home costs</span>
            <span>{fmt(monthlyTotal)}/mo</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-indigo-200 pt-2">
            <span>Annual deductible home office expense</span>
            <span className="text-indigo-700">{fmt(annualDeductible)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
        </div>

        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
