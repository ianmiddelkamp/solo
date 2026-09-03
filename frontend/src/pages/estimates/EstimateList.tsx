import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEstimates, deleteEstimate } from '../../api/estimates';
import PageHeader from '../../components/PageHeader';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
import { confirm } from '../../services/dialog';
import { formatDate } from '../../utils/dates';
import { STATUS_STYLES } from '../../utils/constants';
import type { Estimate } from '../../types';

export default function EstimateList() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEstimates()
      .then((data) => { if (data) setEstimates(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!await confirm('Delete this estimate?')) return;
    try {
      await deleteEstimate(id);
      setEstimates((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const columns: TableColumn<Estimate>[] = [
    {
      key: 'number', label: 'Estimate #',
      render: (est) => <Link to={`/estimates/${est.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{est.number}</Link>,
    },
    { key: 'project', label: 'Project', render: (est) => est.project?.name || '—' },
    { key: 'client', label: 'Client', render: (est) => est.project?.client?.name || '—' },
    {
      key: 'total', label: 'Total',
      render: (est) => est.total != null ? `$${parseFloat(String(est.total)).toFixed(2)}` : '—',
    },
    { key: 'date', label: 'Date', render: (est) => formatDate(est.created_at) },
    {
      key: 'status', label: 'Status',
      render: (est) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[est.status] ?? ''}`}>
          {est.status}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <PageHeader title="Estimates" actionLabel="+ New Estimate" actionTo="/estimates/new" />

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <ResponsiveTable
          columns={columns}
          rows={estimates}
          keyExtractor={(est) => est.id}
          emptyMessage="No estimates yet."
          actions={(est) => (
            <>
              <Link to={`/estimates/${est.id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
              <button onClick={() => handleDelete(est.id)} className="text-red-500 hover:text-red-700">Delete</button>
            </>
          )}
        />
      )}
    </div>
  );
}
