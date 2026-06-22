import { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { getChargeCodes, createChargeCode, updateChargeCode, deleteChargeCode } from '../../api/chargeCodes';
import { confirm } from '../../services/dialog';
import type { ChargeCode } from '../../types';

const EMPTY = { code: '', description: '', rate: '' };

export default function ChargeCodesPage() {
  const [chargeCodes, setChargeCodes] = useState<ChargeCode[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getChargeCodes().then((data) => { if (data) setChargeCodes(data); }).catch((e) => setError(e.message));
  }, []);

  function startEdit(cc: ChargeCode) {
    setEditingId(cc.id);
    setForm({ code: cc.code, description: cc.description || '', rate: cc.rate != null ? String(cc.rate) : '' });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: Partial<ChargeCode> = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      rate: form.rate !== '' ? parseFloat(form.rate) : null,
    };
    try {
      if (editingId) {
        const updated = await updateChargeCode(editingId, payload);
        if (updated) setChargeCodes((prev) => prev.map((cc) => cc.id === editingId ? updated : cc));
      } else {
        const created = await createChargeCode(payload);
        if (created) setChargeCodes((prev) => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
      }
      cancelEdit();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!await confirm('Delete this charge code?')) return;
    try {
      await deleteChargeCode(id);
      setChargeCodes((prev) => prev.filter((cc) => cc.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Charge Codes" />

      <p className="text-sm text-gray-500 mb-6">
        Charge codes let you bill for standalone work (consultations, training, admin) that isn't tied to a specific project.
      </p>

      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">{editingId ? 'Edit Charge Code' : 'New Charge Code'}</h2>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                placeholder="CONSULT"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono uppercase px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Consultation & Discovery"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-gray-600 mb-1">Rate (optional override)</label>
            <input
              type="number"
              name="rate"
              value={form.rate}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="Leave blank to use client rate"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">If blank, falls back to the client's rate.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Charge Code'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {chargeCodes.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chargeCodes.map((cc) => (
                <tr key={cc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-mono font-medium text-gray-900">{cc.code}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{cc.description || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {cc.rate ? `$${parseFloat(String(cc.rate)).toFixed(2)}/hr` : 'Client rate'}
                  </td>
                  <td className="px-5 py-3 text-right text-sm space-x-3">
                    <button onClick={() => startEdit(cc)} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => handleDelete(cc.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chargeCodes.length === 0 && (
        <p className="text-sm text-gray-400">No charge codes yet. Add one above.</p>
      )}
    </div>
  );
}
