import { useEffect, useState } from 'react';
import { getT2125Report } from '../../api/t2125';
import type { T2125Report } from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  advertising: 'Advertising',
  meals: 'Meals & Entertainment (50%)',
  office: 'Office Expenses',
  professional_fees: 'Professional Fees',
  rent: 'Rent',
  software: 'Software & Subscriptions',
  supplies: 'Supplies',
  travel: 'Travel',
  vehicle: 'Vehicle Expenses',
  other: 'Other Expenses',
};

function fmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—';
}

function Line({ label, value, bold, indent, line }: { label: string; value: string; bold?: boolean; indent?: boolean; line?: string }) {
  return (
    <div className={`flex justify-between py-2 border-b border-gray-100 text-sm ${bold ? 'font-bold' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className="text-gray-700">
        {line && <span className="text-gray-400 mr-2 font-mono text-xs">{line}</span>}
        {label}
      </span>
      <span className={bold ? 'text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  );
}

export default function T2125ReportPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [report, setReport] = useState<T2125Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [year]);

  async function load() {
    setLoading(true);
    try {
      const data = await getT2125Report(year);
      if (data) setReport(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T2125 Report</h1>
          <p className="text-sm text-gray-500 mt-1">Statement of Business Activities</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm sm:text-sm px-3 py-2">
            {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={() => window.print()}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Print
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {report && (
        <div className="space-y-5 print:space-y-4">
          {/* Part 1 — Identification */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Part 1 — Identification</h2>
            <Line label="Business Name" value={report.business_name || '—'} />
            <Line label="HST Registration #" value={report.hst_number || '—'} />
            <Line label="Tax Year" value={String(report.year)} />
          </div>

          {/* Part 2 — Income */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Part 2 — Income</h2>
            <Line line="8000" label="Gross business income" value={fmt(report.gross_revenue)} />
            <Line line="8230" label="HST collected (not income)" value={`(${fmt(report.hst_collected)})`} indent />
            <Line line="8299" label="Net revenue" value={fmt(report.net_revenue)} bold />
          </div>

          {/* Part 4 — Expenses */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Part 4 — Business Expenses</h2>
            {Object.entries(report.expenses_by_category).length === 0 && (
              <p className="text-sm text-gray-400">No expenses recorded for {year}.</p>
            )}
            {Object.entries(report.expenses_by_category).map(([cat, amount]) => (
              <Line key={cat} label={CATEGORY_LABELS[cat] || cat} value={fmt(amount)} indent />
            ))}
            <Line label="Total Expenses" value={fmt(report.total_expenses)} bold />
          </div>

          {/* CCA */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Part 5 — Capital Cost Allowance (Schedule 8)</h2>
            {report.cca_details.length === 0 && (
              <p className="text-sm text-gray-400">No CCA assets recorded.</p>
            )}
            {report.cca_details.map(a => (
              <Line key={a.id} label={`${a.name} (${a.cca_class}, ${a.cca_rate}%)`} value={fmt(a.deduction)} indent />
            ))}
            <Line label="Total CCA" value={fmt(report.total_cca)} bold />
          </div>

          {/* Home Office */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Home Office Expenses</h2>
            <Line label={`Business use (${report.home_office_percentage.toFixed(1)}%)`} value={fmt(report.home_office_deduction)} />
          </div>

          {/* Net Income */}
          <div className="bg-indigo-50 rounded-lg p-5">
            <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Net Business Income</h2>
            <Line label="Revenue" value={fmt(report.gross_revenue)} />
            <Line label="Less: Business expenses" value={`(${fmt(report.total_expenses)})`} />
            <Line label="Less: CCA" value={`(${fmt(report.total_cca)})`} />
            <Line label="Less: Home office" value={`(${fmt(report.home_office_deduction)})`} />
            <div className="flex justify-between pt-3 border-t border-indigo-200 text-base font-bold">
              <span className="text-gray-900">Net Business Income (Line 13500)</span>
              <span className="text-indigo-700">{fmt(report.net_income)}</span>
            </div>
          </div>

          {/* HST Summary */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">HST Summary</h2>
            <Line label="HST collected on invoices" value={fmt(report.hst_collected)} />
            <Line label="HST remitted to CRA" value={fmt(report.hst_remitted)} />
            <Line label="Difference" value={fmt(report.hst_collected - report.hst_remitted)} bold />
          </div>
        </div>
      )}
    </div>
  );
}
