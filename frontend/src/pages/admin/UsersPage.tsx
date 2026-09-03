import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
import { getUsers } from '../../api/users';
import type { ManagedUser } from '../../api/users';

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getUsers()
      .then((data) => { if (data) setUsers(data); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const columns: TableColumn<ManagedUser>[] = [
    {
      key: 'name', label: 'Name',
      render: (u) => (
        <span className="font-medium text-gray-900">
          {u.name}
          {u.role === 'admin' && (
            <span className="ml-2 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700">Admin</span>
          )}
        </span>
      ),
    },
    { key: 'email', label: 'Email', render: (u) => u.email },
    { key: 'business', label: 'Business', render: (u) => u.business_name || '—' },
    {
      key: 'last_login', label: 'Last Login',
      render: (u) => u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never',
    },
    {
      key: 'status', label: 'Status',
      render: (u) => u.archived_at ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Archived</span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-8">
      <PageHeader title="Users" />

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}
      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && !error && (
        <ResponsiveTable
          columns={columns}
          rows={users}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
          emptyMessage="No users yet."
        />
      )}
    </div>
  );
}
