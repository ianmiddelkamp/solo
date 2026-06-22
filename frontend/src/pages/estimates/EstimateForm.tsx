import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../../api/projects';
import { createEstimate } from '../../api/estimates';
import PageHeader from '../../components/PageHeader';
import type { Project } from '../../types';

export default function EstimateForm() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getProjects()
      .then((ps) => {
        if (!ps) return;
        setProjects(ps);
        if (ps.length > 0) setProjectId(String(ps[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const estimate = await createEstimate({ project_id: projectId });
      if (estimate) navigate(`/estimates/${estimate.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <PageHeader title="New Estimate" />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-400">
          All tasks with estimated hours in the selected project will be included.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={generating || !projectId}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating…' : 'Generate Estimate'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/estimates')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
