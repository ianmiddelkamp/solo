import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import HelpButton from '../../components/HelpButton';
import { hstReturnsListHelp } from '../../content/helpCopy';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
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

  const columns: TableColumn<HstReturn>[] = [
    {
      key: 'period', label: 'Period',
      render: (r) => <span className="whitespace-nowrap">{r.period_start} – {r.period_end}</span>,
    },
    {
      key: 'status', label: 'Status',
      render: (r) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status]}`}>
          {r.status}
        </span>
      ),
    },
    { key: 'revenue', label: 'Revenue (L101)', align: 'right', render: (r) => fmt(r.total_revenue) },
    { key: 'hst_collected', label: 'HST Collected (L103)', align: 'right', render: (r) => fmt(r.hst_collected) },
    { key: 'itcs', label: 'ITCs (L106)', align: 'right', render: (r) => fmt(r.input_tax_credits) },
    {
      key: 'net_tax', label: 'Net Tax', align: 'right',
      render: (r) => <span className="font-semibold text-gray-900">{fmt(r.net_tax)}</span>,
    },
    { key: 'amount_paid', label: 'Amount Paid', align: 'right', render: (r) => fmt(r.amount_paid) },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="HST Returns"
        action={{ label: 'New Return', onClick: () => setShowNew(true) }}
        help={<HelpButton title={hstReturnsListHelp.title}>{hstReturnsListHelp.content}</HelpButton>}
      />

      {showNew && (
        <NewHstReturnDialog
          onClose={() => setShowNew(false)}
          onCreated={(r) => { setReturns(prev => [r, ...prev]); setShowNew(false); }}
        />
      )}

      {returns.length > 0 ? (
        <ResponsiveTable
          columns={columns}
          rows={returns}
          keyExtractor={(r) => r.id}
          actions={(r) => (
            <>
              <Link to={`/hst-returns/${r.id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
              {r.status === 'draft' && (
                <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">Delete</button>
              )}
            </>
          )}
        />
      ) : (
        <p className="text-sm text-gray-400">No HST returns yet. Create one to get started.</p>
      )}
    </div>
  );
}
