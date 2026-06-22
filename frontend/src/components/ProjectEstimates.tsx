import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEstimates, createEstimate, deleteEstimate } from '../api/estimates';
import { formatDate } from '../utils/dates';
import { STATUS_STYLES } from '../utils/constants';
import { confirm } from '../services/dialog';
import type { Estimate } from '../types';

export default function ProjectEstimates({ projectId }: { projectId: number }) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [creatingEstimate, setCreatingEstimate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getEstimates(projectId)
      .then((data) => setEstimates(data ?? []))
      .catch(() => setEstimates([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleEstimateClick() {
    setCreatingEstimate(true);
    try {
      const estimate = await createEstimate({ project_id: projectId });
      if (estimate) navigate(`/estimates/${estimate.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingEstimate(false);
    }
  }

  async function handleDelete(id: number) {
    if (!await confirm('Delete this estimate?')) return;
    try {
      await deleteEstimate(id);
      setEstimates((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-[750px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Estimates</h3>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="rounded-lg overflow-hidden border border-gray-200 mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimate #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!loading && estimates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No estimates yet.</td>
                </tr>
              )}
              {!loading && estimates.map((est) => (
                <tr key={est.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link to={`/estimates/${est.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {est.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {est.total != null ? `$${parseFloat(String(est.total)).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(est.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[est.status]}`}>
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

        <div className="flex items-center justify-between">
          <button
            disabled={creatingEstimate}
            onClick={handleEstimateClick}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {creatingEstimate ? 'Creating Estimate…' : estimates.length > 0 ? 'Update Estimate' : 'Create Estimate'}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
