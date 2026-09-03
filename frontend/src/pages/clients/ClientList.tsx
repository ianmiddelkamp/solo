import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../../api/clients';
import PageHeader from '../../components/PageHeader';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
import type { Client } from '../../types';

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getClients()
      .then((data) => { if (data) setClients(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
          onRowClick={(c) => navigate(`/clients/${c.id}/edit`)}
          emptyMessage="No clients yet."
        />
      )}
    </div>
  );
}
