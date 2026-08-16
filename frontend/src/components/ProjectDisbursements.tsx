import { useEffect, useState } from 'react';
import { getDisbursements, createDisbursement, updateDisbursement, deleteDisbursement } from '../api/disbursements';
import { confirm } from '../services/dialog';
import type { Disbursement } from '../types';

const EMPTY = { description: '', amount: '', incurred_on: '' };

export default function ProjectDisbursements({ projectId }: { projectId: number }) {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editingDateId, setEditingDateId] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getDisbursements(projectId).then((data) => { if (data) setDisbursements(data); }).catch((e) => setError(e.message));
  }, [projectId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const disbursement = await createDisbursement(projectId, {
        description: form.description,
        amount: parseFloat(form.amount),
        incurred_on: form.incurred_on || null,
      });
      if (disbursement) setDisbursements((prev) => [...prev, disbursement]);
      setForm(EMPTY);
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePaid(disbursement: Disbursement) {
    try {
      const updated = await updateDisbursement(projectId, disbursement.id, { paid: !disbursement.paid });
      if (updated) setDisbursements((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDateChange(disbursement: Disbursement, incurred_on: string) {
    try {
      const updated = await updateDisbursement(projectId, disbursement.id, { incurred_on: incurred_on || null });
      if (updated) setDisbursements((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEditingDateId(null);
    }
  }

  async function handleDelete(disbursement: Disbursement) {
    if (!await confirm(`Delete "${disbursement.description}"?`)) return;
    await deleteDisbursement(projectId, disbursement.id);
    setDisbursements((prev) => prev.filter((d) => d.id !== disbursement.id));
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Disbursements</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Add Disbursement
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount ($) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Incurred</label>
            <input
              type="date"
              value={form.incurred_on}
              onChange={(e) => setForm((prev) => ({ ...prev, incurred_on: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setForm(EMPTY); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {disbursements.length > 0 && (
        <ul className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 shadow-sm">
          {disbursements.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{d.description}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  ${parseFloat(String(d.amount)).toFixed(2)}
                  {' · '}
                  {editingDateId === d.id ? (
                    <input
                      type="date"
                      autoFocus
                      defaultValue={d.incurred_on || ''}
                      onBlur={(e) => handleDateChange(d, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingDateId(null);
                      }}
                      className="text-xs border-b border-indigo-400 outline-none bg-transparent text-gray-600"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDateId(d.id)}
                      className="hover:text-indigo-600 underline decoration-dotted underline-offset-2"
                      title="Edit date incurred"
                    >
                      {d.incurred_on || 'set date'}
                    </button>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleTogglePaid(d)}
                className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 transition-colors ${
                  d.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
              >
                {d.paid ? 'Paid' : 'Unpaid'}
              </button>
              <button
                onClick={() => handleDelete(d)}
                className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                aria-label="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {disbursements.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No disbursements yet.</p>
      )}
    </div>
  );
}
