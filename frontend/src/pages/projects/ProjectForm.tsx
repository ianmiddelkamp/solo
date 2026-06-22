import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, createProject, updateProject, toggleArchive } from '../../api/projects';
import { getClients } from '../../api/clients';
import { getProjectRate, setProjectRate, getClientRate } from '../../api/rates';
import PageHeader from '../../components/PageHeader';
import TaskBoard from '../../components/TaskBoard';
import ProjectEstimates from '../../components/ProjectEstimates';
import ProjectAttachments from '../../components/ProjectAttachments';
import type { Client } from '../../types';
import { confirm } from '../../services/dialog';

const EMPTY = { name: '', client_id: '', description: '' };

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const projectId = id ? Number(id) : undefined;

  const [form, setForm] = useState(EMPTY);
  const [rate, setRateValue] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archived, setArchived] = useState(false)

  useEffect(() => {
    getClients().then((data) => { if (data) setClients(data); }).catch((e) => setError(e.message));

    if (isEdit && projectId) {
      getProject(projectId)
        .then((p) => {
          if (p) {
            setForm({ name: p.name, client_id: String(p.client_id), description: p.description || '' });
            setArchived(p.is_archived)
          }
        })
        .catch((e) => setError(e.message));

      getProjectRate(projectId)
        .then((r) => setRateValue(r?.rate != null ? String(r.rate) : ''))
        .catch(() => { });
    }
  }, [id, isEdit]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'client_id' && !isEdit && value) {
      getClientRate(Number(value))
        .then((r) => { if (r?.rate != null) setRateValue(String(r.rate)); })
        .catch(() => { });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let pid: number;
      if (isEdit && projectId) {
        await updateProject(projectId, { ...form, client_id: Number(form.client_id) });
        pid = projectId;
      } else {
        const created = await createProject({ ...form, client_id: Number(form.client_id) });
        if (!created) return;
        pid = created.id;
      }

      if (rate !== '') {
        await setProjectRate(pid, parseFloat(rate));
      }

      navigate('/projects');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    const ok = await confirm(`${archived ? "Un-Archive" : "Archive"} this project?`)
    if (ok) {
      try {
        const response = await toggleArchive(projectId!, !archived)
        if (response?.success) {
          setArchived(!archived)
        }
      } catch (err) {
        setError((err as Error).message);
      }

    }
  }

  return (
    <div className="p-8">
      <PageHeader title={isEdit ? 'Edit Project' : 'New Project'} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
      )}

      <div className="flex gap-8 items-start">
        <div className="w-96 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Details</h3>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                name="rate"
                value={rate}
                onChange={(e) => setRateValue(e.target.value)}
                min="0"
                step="0.01"
                placeholder="e.g. 150.00"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
          {isEdit && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mt-4">Project Actions</h3>
              <div className="bg-white rounded-lg shadow p-6 space-y-5 my-5">

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={confirmArchive}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md   ${archived ? "bg-indigo-600" : "bg-red-500"}`}>
                    {archived ? "Un-archive" : "Archive"}
                  </button>

                </div>

              </div>
            </>
          )}

        </div>

        {isEdit && projectId && (
          <div className="flex-1 min-w-0">
            <TaskBoard projectId={projectId} />
          </div>
        )}
        {isEdit && projectId && (
          <div className="flex-1 min-w-0">
            <ProjectEstimates projectId={projectId} />
          </div>
        )}
        {isEdit && projectId && (
          <div className="flex-1 min-w-0">
            <ProjectAttachments projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}
