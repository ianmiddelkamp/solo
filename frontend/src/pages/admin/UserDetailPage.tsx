import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import {
  getManagedUser, updateManagedUser, archiveUser, unarchiveUser,
  sendPasswordReset, impersonateUser,
} from '../../api/users';
import type { ManagedUser } from '../../api/users';
import { setToken, setUser, setImpersonating, getUser } from '../../api/index';
import { confirm } from '../../services/dialog';

export default function UserDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const navigate = useNavigate();
  const me = getUser();

  const [user, setManagedUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: '' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getManagedUser(id)
      .then((data) => { if (data) { setManagedUser(data); setForm({ name: data.name, email: data.email, role: data.role || '' }); } })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const isSelf = me?.id === id;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateManagedUser(id, form);
      if (updated) { setManagedUser(updated); setMessage('Saved.'); }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!user) return;
    const archiving = !user.archived_at;
    if (archiving && !await confirm(`Archive ${user.name}? They won't be able to log in until unarchived.`)) return;

    setBusy(true);
    setError(null);
    try {
      const updated = archiving ? await archiveUser(id) : await unarchiveUser(id);
      if (updated) setManagedUser(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendReset() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await sendPasswordReset(id);
      if (res) setMessage(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImpersonate() {
    if (!user) return;
    if (!await confirm(`Impersonate ${user.name}? You'll see the app exactly as they do until you exit.`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await impersonateUser(id);
      if (res) {
        setToken(res.token);
        setUser(res.user);
        setImpersonating(true);
        navigate('/');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <div className="p-8 text-red-600">{error || 'User not found.'}</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/users')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Users
        </button>
      </div>
      <PageHeader title={user.name} />

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}
      {message && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">{message}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Stats</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-400">Business</dt>
            <dd className="text-gray-900">{user.business_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Last login</dt>
            <dd className="text-gray-900">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Time entries logged</dt>
            <dd className="text-gray-900">{user.time_entries_count ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Status</dt>
            <dd className="text-gray-900">{user.archived_at ? 'Archived' : 'Active'}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700">Account</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            disabled={isSelf}
            title={isSelf ? "You can't change your own role" : undefined}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Actions</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSendReset}
            disabled={busy}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Send Password Reset
          </button>

          {!isSelf && !user.archived_at && user.role !== 'admin' && (
            <button
              type="button"
              onClick={handleImpersonate}
              disabled={busy}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Impersonate
            </button>
          )}

          {!isSelf && (
            <button
              type="button"
              onClick={handleArchiveToggle}
              disabled={busy}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 transition-colors ${
                user.archived_at ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {user.archived_at ? 'Unarchive' : 'Archive'}
            </button>
          )}
        </div>
        {isSelf && (
          <p className="text-xs text-gray-400">You can't archive or impersonate your own account.</p>
        )}
      </div>
    </div>
  );
}
