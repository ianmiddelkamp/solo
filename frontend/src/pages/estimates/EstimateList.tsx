import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEstimates, deleteEstimate } from '../../api/estimates';
import PageHeader from '../../components/PageHeader';
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

  return (
    <div className="p-8">
      <PageHeader title="Estimates" actionLabel="+ New Estimate" actionTo="/estimates/new" />

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimate #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No estimates yet.</td>
                </tr>
              )}
              {estimates.map((est) => (
                <tr key={est.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link to={`/estimates/${est.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {est.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{est.project?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{est.project?.client?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {est.total != null ? `$${parseFloat(String(est.total)).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(est.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[est.status] ?? ''}`}>
                      {est.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <Link to={`/estimates/${est.id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
                    <button onClick={() => handleDelete(est.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
