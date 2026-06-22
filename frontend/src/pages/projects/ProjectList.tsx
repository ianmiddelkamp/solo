import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, deleteProject } from '../../api/projects';
import PageHeader from '../../components/PageHeader';
import { confirm } from '../../services/dialog';
import type { Project } from '../../types';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    showArchived: false,
  });

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.showArchived) params.show_archived = 'true';
    getProjects(params)
      .then((data) => { if (data) setProjects(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  async function handleDelete(id: number) {
    if (!await confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function goToProject(id: number) {
    navigate(`/projects/${id}/edit`);
  }
  function setFilter(key: string, value: string | boolean) {
    setFilters((prev) => {
      return { ...prev, [key]: value };
    });
  }
  return (
    <div className="p-8">
      <PageHeader title="Projects" actionLabel="+ New Project" actionTo="/projects/new" />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.showArchived}
            onChange={(e) => setFilter('showArchived', e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show Archived
        </label>
      </div>
      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate / hr</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No projects yet.</td>
                </tr>
              )}
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => goToProject(project.id)}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{project.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{project.client?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {project.current_rate != null ? `$${parseFloat(String(project.current_rate)).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{project.description || '—'}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="text-red-500 hover:text-red-700">
                      Delete
                    </button>
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
