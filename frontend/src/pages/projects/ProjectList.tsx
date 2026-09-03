import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../../api/projects';
import PageHeader from '../../components/PageHeader';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
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

  function goToProject(id: number) {
    navigate(`/projects/${id}/edit`);
  }
  function setFilter(key: string, value: string | boolean) {
    setFilters((prev) => {
      return { ...prev, [key]: value };
    });
  }

  const columns: TableColumn<Project>[] = [
    { key: 'name', label: 'Project', render: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
    { key: 'client', label: 'Client', render: (p) => p.client?.name || '—' },
    {
      key: 'rate', label: 'Rate / hr',
      render: (p) => p.current_rate != null ? `$${parseFloat(String(p.current_rate)).toFixed(2)}` : '—',
    },
    {
      key: 'description', label: 'Description',
      render: (p) => <span className="block max-w-xs truncate">{p.description || '—'}</span>,
    },
  ];

  return (
    <div className="p-4 sm:p-8">
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
        <ResponsiveTable
          columns={columns}
          rows={projects}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => goToProject(p.id)}
          emptyMessage="No projects yet."
        />
      )}
    </div>
  );
}
