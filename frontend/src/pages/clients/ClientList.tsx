import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClients, deleteClient } from '../../api/clients';
import PageHeader from '../../components/PageHeader';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
import { confirm } from '../../services/dialog';
import type { Client } from '../../types';

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClients()
      .then((data) => { if (data) setClients(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!await confirm('Delete this client?')) return;
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const columns: TableColumn<Client>[] = [
    { key: 'name', label: 'Business Name', render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    { key: 'contact', label: 'Contact', render: (c) => c.primary_contact?.name || '—' },
    { key: 'email', label: 'Email', render: (c) => c.primary_contact?.email || '—' },
    { key: 'phone', label: 'Phone', render: (c) => c.primary_contact?.phone || '—' },
    {
      key: 'rate', label: 'Default Rate',
      render: (c) => c.current_rate != null ? `$${parseFloat(String(c.current_rate)).toFixed(2)}/hr` : '—',
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <PageHeader title="Clients" actionLabel="+ New Client" actionTo="/clients/new" />

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <ResponsiveTable
          columns={columns}
          rows={clients}
          keyExtractor={(c) => c.id}
          emptyMessage="No clients yet."
          actions={(client) => (
            <>
              <Link to={`/clients/${client.id}/edit`} className="text-indigo-600 hover:text-indigo-800">Edit</Link>
              <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-700">Delete</button>
            </>
          )}
        />
      )}
    </div>
  );
}
