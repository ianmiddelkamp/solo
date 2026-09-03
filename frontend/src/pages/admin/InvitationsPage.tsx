import { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import ResponsiveTable, { type TableColumn } from '../../components/ResponsiveTable';
import { getInvitations, createInvitation, deleteInvitation, resendInvitation } from '../../api/invitations';
import type { Invitation } from '../../api/invitations';
import { confirm } from '../../services/dialog';

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    getInvitations()
      .then((data) => { if (data) setInvitations(data); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  async function handleDelete(inv: Invitation) {
    if (!await confirm(`Delete the invitation to ${inv.email}?`)) return;
    try {
      await deleteInvitation(inv.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleResend(inv: Invitation) {
    try {
      await resendInvitation(inv.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await createInvitation(email.trim());
      setEmail('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const invitationColumns: TableColumn<Invitation>[] = [
    { key: 'email', label: 'Email', render: (inv) => inv.email },
    {
      key: 'sent', label: 'Sent',
      render: (inv) => inv.invite_sent_at ? new Date(inv.invite_sent_at).toLocaleDateString() : '—',
    },
    {
      key: 'status', label: 'Status',
      render: (inv) => inv.accepted_at ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Accepted</span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <PageHeader title="Invitations" />

      <p className="text-sm text-gray-500 mb-6">
        Invite a new user by email. They'll receive a link to set their own name and password.
      </p>

      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Send Invitation</h2>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="teammate@example.com"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      </div>

      {!loading && invitations.length > 0 && (
        <ResponsiveTable
          columns={invitationColumns}
          rows={invitations}
          keyExtractor={(inv) => inv.id}
          actions={(inv) => !inv.accepted_at && (
            <>
              <button onClick={() => handleResend(inv)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                Resend
              </button>
              <button onClick={() => handleDelete(inv)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                Delete
              </button>
            </>
          )}
        />
      )}

      {!loading && invitations.length === 0 && (
        <p className="text-sm text-gray-400">No invitations sent yet.</p>
      )}
    </div>
  );
}
