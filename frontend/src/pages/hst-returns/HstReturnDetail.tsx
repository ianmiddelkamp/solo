import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHstReturn, updateHstReturn } from '../../api/hstReturns';
import type { HstReturn } from '../../types';

function fmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  filed: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

export default function HstReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [r, setR] = useState<HstReturn | null>(null);
  const [editing, setEditing] = useState<Partial<HstReturn>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) getHstReturn(Number(id)).then(data => { if (data) setR(data); });
  }, [id]);

  if (!r) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  const merged = { ...r, ...editing };
  const netTax = (Number(merged.hst_collected) || 0) - (Number(merged.input_tax_credits) || 0);

  function change(field: keyof HstReturn, value: string | number) {
    setEditing(prev => ({ ...prev, [field]: value }));
  }

  async function save(extra?: Partial<HstReturn>) {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...editing, net_tax: netTax, ...extra };
      const updated = await updateHstReturn(r!.id, payload);
      if (updated) { setR(updated); setEditing({}); }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function markFiled() {
    await save({ status: 'filed', filed_at: new Date().toISOString() });
  }

  async function markPaid() {
    await save({ status: 'paid', paid_at: new Date().toISOString() });
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/hst-returns')} className="text-sm text-gray-500 hover:text-gray-800">← Returns</button>
        <h1 className="text-xl font-bold text-gray-900">HST Return</h1>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status]}`}>
          {r.status}
        </span>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Reporting Period</h2>
        <Field label="Period Start" value={r.period_start} />
        <Field label="Period End" value={r.period_end} />
      </div>

      <div className="bg-white rounded-lg shadow p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">CRA Line Items</h2>
        <Field label="Line 101 — Total Revenue" value={fmt(r.total_revenue)} />
        <Field label="Line 103 — HST Collected" value={fmt(r.hst_collected)} />

        <div className="flex justify-between py-2 border-b border-gray-100 text-sm items-center">
          <span className="text-gray-500">Line 106 — Input Tax Credits</span>
          <input
            type="number" min="0" step="0.01"
            value={editing.input_tax_credits != null ? String(editing.input_tax_credits) : String(r.input_tax_credits)}
            onChange={e => change('input_tax_credits', parseFloat(e.target.value) || 0)}
            className="w-28 rounded border-gray-300 text-sm text-right px-2 py-1"
          />
        </div>

        <div className="flex justify-between py-3 text-sm font-bold border-t border-gray-300 mt-1">
          <span>Net Tax Owing</span>
          <span className={netTax < 0 ? 'text-green-600' : 'text-gray-900'}>{fmt(netTax)}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5 mb-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Filing & Payment</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CRA Confirmation #</label>
            <input value={editing.filing_reference != null ? editing.filing_reference : (r.filing_reference || '')}
              onChange={e => change('filing_reference', e.target.value)}
              placeholder="e.g. 1234567890"
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Filed At</label>
            <input type="date"
              value={(editing.filed_at || r.filed_at || '').split('T')[0]}
              onChange={e => change('filed_at', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Due</label>
            <input type="date"
              value={editing.payment_due_date != null ? editing.payment_due_date : (r.payment_due_date || '')}
              onChange={e => change('payment_due_date', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid</label>
            <input type="number" min="0" step="0.01"
              value={editing.amount_paid != null ? String(editing.amount_paid) : String(r.amount_paid || '')}
              onChange={e => change('amount_paid', parseFloat(e.target.value) || 0)}
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Paid At</label>
            <input type="date"
              value={(editing.paid_at || r.paid_at || '').split('T')[0]}
              onChange={e => change('paid_at', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea rows={2}
            value={editing.notes != null ? editing.notes : (r.notes || '')}
            onChange={e => change('notes', e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={() => save()} disabled={saving || Object.keys(editing).length === 0}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {r.status === 'draft' && (
          <button onClick={markFiled} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            Mark as Filed
          </button>
        )}
        {r.status === 'filed' && (
          <button onClick={markPaid} disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50">
            Mark as Paid
          </button>
        )}
      </div>
    </div>
  );
}
