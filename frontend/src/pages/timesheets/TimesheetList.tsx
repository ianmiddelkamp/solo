import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getClients } from '../../api/clients';
import { getProjects } from '../../api/projects';
import { getAllTimeEntries, deleteTimeEntry, deleteChargeCodeTimeEntry } from '../../api/timeEntries';
import PageHeader from '../../components/PageHeader';
import { formatDateTime, formatDate } from '../../utils/dates';
import { confirm } from '../../services/dialog';
import type { Client, Project, TimeEntry } from '../../types';

export default function TimesheetList() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    clientId: '',
    projectId: '',
    status: 'all',
    hideChargeCodes: false,
  });

  const [sort, setSort] = useState({ column: 'date', direction: 'desc' });

  function toggleSort(column: string) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    );
  }

  function sortIndicator(column: string) {
    if (sort.column !== column) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>;
  }

  useEffect(() => {
    getClients().then((data) => { if (data) setClients(data); }).catch(() => {});
    getProjects().then((data) => { if (data) setProjects(data); }).catch(() => {});
  }, []);

  const visibleProjects = filters.clientId
    ? projects.filter((p) => String(p.client?.id) === filters.clientId)
    : projects;

  const loadEntries = useCallback(() => {
    setLoading(true);
    setError(null);
    setSelected(new Set());

    const params: Record<string, string> = {};
    if (filters.clientId) params.client_id = filters.clientId;
    if (filters.projectId) params.project_id = filters.projectId;
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.hideChargeCodes) params.hide_charge_codes = 'true';

    getAllTimeEntries(params)
      .then((data) => { if (data) setEntries(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function setFilter(key: string, value: string | boolean) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'clientId') next.projectId = '';
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedEntries = entries.filter((e) => selected.has(e.id));
  const selectedTotalHours = selectedEntries.reduce((prev, curr) => prev + curr.hours, 0).toFixed(2);
  const allSelectedUnbilled = selectedEntries.length > 0 && selectedEntries.every((e) => !e.invoice_line_item);
  const selectedClientIds = new Set(
    selectedEntries.map((e) => e.project ? String(e.project.client_id) : String(e.client_id))
  );
  const canCreateInvoice = allSelectedUnbilled && selectedClientIds.size === 1;

  function handleCreateInvoice() {
    const clientId = [...selectedClientIds][0];
    navigate('/invoices/new', { state: { entries: selectedEntries, clientId } });
  }

  async function handleDelete(entry: TimeEntry) {
    if (!await confirm('Delete this time entry?')) return;
    try {
      if (entry.charge_code) {
        await deleteChargeCodeTimeEntry(entry.id);
      } else if (entry.project) {
        await deleteTimeEntry(entry.project.id, entry.id);
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setSelected((prev) => { const next = new Set(prev); next.delete(entry.id); return next; });
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function clientNameForEntry(entry: TimeEntry) {
    return entry.project?.client?.name || entry.client?.name || '—';
  }

  const sortableColumns = ['date', 'hours', 'client', 'project', 'task'];

  const sortedEntries = [...entries].sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.column) {
      case 'date':    return dir * a.date.localeCompare(b.date);
      case 'hours':   return dir * (a.hours - b.hours);
      case 'client':  return dir * clientNameForEntry(a).localeCompare(clientNameForEntry(b));
      case 'project': return dir * (a.project?.name || a.charge_code?.code || '').localeCompare(b.project?.name || b.charge_code?.code || '');
      case 'task':    return dir * (a.task?.title || '').localeCompare(b.task?.title || '');
      default:        return 0;
    }
  });

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const allChecked = entries.length > 0 && selected.size === entries.length;
  const someChecked = selected.size > 0 && selected.size < entries.length;

  return (
    <div className="p-8">
      <PageHeader title="Timesheets" actionLabel="+ Log Time" actionTo="/timesheets/new" />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={filters.clientId}
          onChange={(e) => setFilter('clientId', e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        >
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filters.projectId}
          onChange={(e) => setFilter('projectId', e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        >
          <option value="">All Projects</option>
          {visibleProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        >
          <option value="all">All</option>
          <option value="unbilled">Unbilled</option>
          <option value="billed">Invoiced</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.hideChargeCodes}
            onChange={(e) => setFilter('hideChargeCodes', e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Hide charge codes
        </label>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <span className="text-sm text-gray-500">{selectedTotalHours} hours</span>
            {canCreateInvoice ? (
              <button
                onClick={handleCreateInvoice}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                Create Invoice
              </button>
            ) : allSelectedUnbilled && selectedClientIds.size > 1 ? (
              <span className="text-sm text-amber-600">Selected entries span multiple clients</span>
            ) : null}
          </div>
        )}
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked; }}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  {[
                    { key: 'date', label: 'Date' },
                    { key: 'started_at', label: 'StartTime' },
                    { key: 'stopped_at', label: 'EndTime' },
                    { key: 'hours', label: 'Hours' },
                    { key: 'client', label: 'Client' },
                    { key: 'project', label: 'Project / Code' },
                    { key: 'task', label: 'Task' },
                    { key: 'description', label: 'Description' },
                  ].map(({ key, label }) => sortableColumns.includes(key) ? (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    >
                      {label}{sortIndicator(key)}
                    </th>
                  ) : (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-400">No time entries found.</td>
                  </tr>
                )}
                {sortedEntries.map((entry) => {
                  const invoiced = Boolean(entry.invoice_line_item?.invoice);
                  return (
                    <tr key={entry.id} className={`hover:bg-gray-50 ${selected.has(entry.id) ? 'bg-indigo-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleOne(entry.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDateTime(entry.started_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDateTime(entry.stopped_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{entry.hours.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{clientNameForEntry(entry)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {entry.project
                          ? entry.project.name
                          : <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{entry.charge_code?.code}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{entry.task?.title || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{entry.description || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {invoiced
                          ? <Link to={`/invoices/${entry.invoice_line_item!.invoice!.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                            {entry.invoice_line_item!.invoice!.number}
                          </Link>
                          : <span className="text-gray-400">Unbilled</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-sm space-x-3 whitespace-nowrap">
                        {invoiced ? (
                          <span className="text-gray-300">Locked</span>
                        ) : (
                          <>
                            <Link
                              to={`/timesheets/${entry.id}/edit`}
                              state={entry.charge_code
                                ? { chargeCodeId: entry.charge_code_id, clientId: entry.client_id }
                                : { projectId: entry.project?.id, clientId: entry.project?.client_id }
                              }
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              Edit
                            </Link>
                            <button onClick={() => handleDelete(entry)} className="text-red-500 hover:text-red-700">
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {entries.length > 0 && (
            <div className="mt-3 text-right text-sm font-medium text-gray-700">
              Total: <span className="text-gray-900">{totalHours.toFixed(2)} hrs</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
