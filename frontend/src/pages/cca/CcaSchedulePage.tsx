import { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { getCcaAssets, createCcaAsset, updateCcaAsset, deleteCcaAsset } from '../../api/ccaAssets';
import { confirm } from '../../services/dialog';
import type { CcaAsset } from '../../types';

const CCA_CLASSES = [
  { value: 'Class 8', label: 'Class 8 (20%) — Furniture & equipment', rate: 20 },
  { value: 'Class 10', label: 'Class 10 (30%) — Vehicles', rate: 30 },
  { value: 'Class 10.1', label: 'Class 10.1 (30%) — Passenger vehicles >$36k', rate: 30 },
  { value: 'Class 12', label: 'Class 12 (100%) — Small tools under $500', rate: 100 },
  { value: 'Class 50', label: 'Class 50 (55%) — Computer hardware', rate: 55 },
  { value: 'Class 14.1', label: 'Class 14.1 (5%) — Goodwill, customer lists', rate: 5 },
];

const EMPTY_FORM = { name: '', cca_class: '', cca_rate: '', purchase_date: '', cost: '', ucc_opening: '', additions: '', disposals: '', notes: '' };

function fmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—';
}

export default function CcaSchedulePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [assets, setAssets] = useState<CcaAsset[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [year]);

  async function load() {
    const data = await getCcaAssets(year);
    if (data) setAssets(data);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function startEdit(a: CcaAsset) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      cca_class: a.cca_class,
      cca_rate: String(a.cca_rate),
      purchase_date: a.purchase_date,
      cost: String(a.cost),
      ucc_opening: a.ucc_opening != null ? String(a.ucc_opening) : '',
      additions: a.additions != null ? String(a.additions) : '',
      disposals: a.disposals != null ? String(a.disposals) : '',
      notes: a.notes || '',
    });
    setShowForm(true);
    setError(null);
  }

  function cancel() { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setError(null); }

  function handleClassChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cls = CCA_CLASSES.find(c => c.value === e.target.value);
    setForm(prev => ({ ...prev, cca_class: e.target.value, cca_rate: cls ? String(cls.rate) : prev.cca_rate }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      cca_class: form.cca_class,
      cca_rate: parseFloat(form.cca_rate),
      purchase_date: form.purchase_date,
      cost: parseFloat(form.cost),
      ucc_opening: form.ucc_opening !== '' ? parseFloat(form.ucc_opening) : null,
      additions: form.additions !== '' ? parseFloat(form.additions) : 0,
      disposals: form.disposals !== '' ? parseFloat(form.disposals) : 0,
      notes: form.notes.trim() || null,
    };
    try {
      if (editingId) {
        const updated = await updateCcaAsset(editingId, payload);
        if (updated) setAssets(prev => prev.map(a => a.id === editingId ? { ...a, ...updated } : a));
      } else {
        const created = await createCcaAsset(payload);
        if (created) { await load(); }
      }
      cancel();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!await confirm('Delete this asset?')) return;
    await deleteCcaAsset(id);
    setAssets(prev => prev.filter(a => a.id !== id));
  }

  const totalCca = assets.reduce((s, a) => s + (a.cca_deduction || 0), 0);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="CCA Schedule" action={{ label: 'Add Asset', onClick: startNew }} />
      <p className="text-sm text-gray-500 mb-6">
        Capital Cost Allowance (Schedule 8, T2125) — track depreciable business assets and calculate annual deductions.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-600">Tax Year:</label>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2">
          {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{editingId ? 'Edit Asset' : 'New Asset'}</h2>
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Asset Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. MacBook Pro"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CRA Class *</label>
                <select name="cca_class" value={form.cca_class} onChange={handleClassChange} required
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2">
                  <option value="">Select class…</option>
                  {CCA_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CCA Rate (%) *</label>
                <input type="number" name="cca_rate" value={form.cca_rate} onChange={handleChange} required min="0" max="100" step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date *</label>
                <input type="date" name="purchase_date" value={form.purchase_date} onChange={handleChange} required
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost *</label>
                <input type="number" name="cost" value={form.cost} onChange={handleChange} required min="0" step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">UCC Opening (Jan 1 {year})</label>
                <input type="number" name="ucc_opening" value={form.ucc_opening} onChange={handleChange} min="0" step="0.01"
                  placeholder="Leave blank if new this year"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Additions in {year}</label>
                <input type="number" name="additions" value={form.additions} onChange={handleChange} min="0" step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Disposals in {year}</label>
                <input type="number" name="disposals" value={form.disposals} onChange={handleChange} min="0" step="0.01"
                  className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Asset'}
              </button>
              <button type="button" onClick={cancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {assets.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">UCC Opening</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CCA {year}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.cca_class} ({a.cca_rate}%)</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt(a.cost)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{fmt(a.ucc_opening)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(a.cca_deduction)}</td>
                  <td className="px-4 py-3 text-right text-sm space-x-3">
                    <button onClick={() => startEdit(a)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">Total CCA Deduction</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{fmt(totalCca)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No assets yet. Add depreciable business assets above.</p>
      )}
    </div>
  );
}
