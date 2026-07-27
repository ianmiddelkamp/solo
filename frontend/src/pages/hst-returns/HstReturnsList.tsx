import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { getHstReturns, deleteHstReturn } from '../../api/hstReturns';
import { confirm } from '../../services/dialog';
import type { HstReturn } from '../../types';
import NewHstReturnDialog from './NewHstReturnDialog';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  filed: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

function fmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : '—';
}

export default function HstReturnsList() {
  const [returns, setReturns] = useState<HstReturn[]>([]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await getHstReturns();
    if (data) setReturns(data);
  }

  async function handleDelete(id: number) {
    if (!await confirm('Delete this HST return?')) return;
    await deleteHstReturn(id);
    setReturns(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="HST Returns" action={{ label: 'New Return', onClick: () => setShowNew(true) }} />

      {showNew && (
        <NewHstReturnDialog
          onClose={() => setShowNew(false)}
          onCreated={(r) => { setReturns(prev => [r, ...prev]); setShowNew(false); }}
        />
      )}

      {returns.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue (L101)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HST Collected (L103)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ITCs (L106)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Tax</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount Paid</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {r.period_start} – {r.period_end}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt(r.total_revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt(r.hst_collected)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt(r.input_tax_credits)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(r.net_tax)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{fmt(r.amount_paid)}</td>
                  <td className="px-4 py-3 text-right text-sm space-x-3">
                    <Link to={`/hst-returns/${r.id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
                    {r.status === 'draft' && (
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No HST returns yet. Create one to get started.</p>
      )}
    </div>
  );
}
