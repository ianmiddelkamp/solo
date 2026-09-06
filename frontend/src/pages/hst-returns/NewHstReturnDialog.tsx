import { useState, useEffect } from 'react';
import { calculateHstReturn, createHstReturn } from '../../api/hstReturns';
import HelpButton from '../../components/HelpButton';
import { newHstReturnDialogHelp } from '../../content/helpCopy';
import type { HstReturn, HstCalculation } from '../../types';

function lastQuarter(): { start: string; end: string } {
  const now = new Date();
  const q = Math.floor((now.getMonth()) / 3);
  const year = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevQ = q === 0 ? 3 : q - 1;
  const startMonth = prevQ * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function fmt(n: number) { return `$${n.toFixed(2)}`; }

interface Props {
  onClose: () => void;
  onCreated: (r: HstReturn) => void;
}

export default function NewHstReturnDialog({ onClose, onCreated }: Props) {
  const dq = lastQuarter();
  const [periodStart, setPeriodStart] = useState(dq.start);
  const [periodEnd, setPeriodEnd] = useState(dq.end);
  const [calc, setCalc] = useState<HstCalculation | null>(null);
  const [itcOverride, setItcOverride] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCalculate() {
    if (!periodStart || !periodEnd) return;
    setLoading(true);
    setError(null);
    try {
      const result = await calculateHstReturn(periodStart, periodEnd);
      if (result) {
        setCalc(result);
        setItcOverride(result.input_tax_credits.toFixed(2));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runCalculate(); }, []);

  const itc = parseFloat(itcOverride || '0') || 0;
  const netTax = calc ? calc.hst_collected - itc : 0;

  async function handleSave() {
    if (!calc) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createHstReturn({
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: calc.total_revenue,
        hst_collected: calc.hst_collected,
        input_tax_credits: itc,
        net_tax: netTax,
        notes: notes.trim() || undefined,
        status: 'draft',
      } as Partial<HstReturn>);
      if (created) onCreated(created);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">New HST Return</h2>
          <HelpButton title={newHstReturnDialogHelp.title}>{newHstReturnDialogHelp.content}</HelpButton>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period Start</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period End</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
          </div>
        </div>
        <button onClick={runCalculate} disabled={loading}
          className="mb-4 px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 disabled:opacity-50">
          {loading ? 'Calculating…' : 'Recalculate from Invoices & Expenses'}
        </button>

        {calc && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Line 101 — Total Revenue</span>
              <span className="font-medium">{fmt(calc.total_revenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Line 103 — HST Collected</span>
              <span className="font-medium">{fmt(calc.hst_collected)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Line 106 — Input Tax Credits</span>
              <input type="number" value={itcOverride} onChange={e => setItcOverride(e.target.value)}
                min="0" step="0.01"
                className="w-28 rounded border-gray-300 text-sm text-right px-2 py-1" />
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
              <span>Net Tax Owing</span>
              <span className={netTax < 0 ? 'text-green-600' : 'text-gray-900'}>{fmt(netTax)}</span>
            </div>
            <p className="text-xs text-gray-400">{calc.invoice_count} invoice{calc.invoice_count !== 1 ? 's' : ''} in this period</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2" />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handleSave} disabled={saving || !calc}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
