import { useEffect, useState } from 'react';
import { getContacts, createContact, updateContact, deleteContact } from '../api/contacts';
import { confirm } from '../services/dialog';
import type { Contact } from '../types';

const EMPTY = { name: '', email: '', phone: '', phone2: '' };

export default function ClientContacts({ clientId }: { clientId: number }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingRolesId, setEditingRolesId] = useState<number | null>(null);
  const [rolesInput, setRolesInput] = useState('');

  useEffect(() => {
    if (!clientId) return;
    getContacts(clientId).then((data) => { if (data) setContacts(data); }).catch((e) => setError(e.message));
  }, [clientId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const contact = await createContact(clientId, form);
      if (contact) setContacts((prev) => [...prev, contact]);
      setForm(EMPTY);
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMakePrimary(contact: Contact) {
    setBusyId(contact.id);
    setError(null);
    try {
      await updateContact(clientId, contact.id, { primary: true });
      setContacts((prev) => prev.map((c) => ({ ...c, primary: c.id === contact.id })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function startEditingRoles(contact: Contact) {
    setEditingRolesId(contact.id);
    setRolesInput((contact.roles ?? []).map((r) => r.name).join(', '));
  }

  async function saveRoles(contact: Contact) {
    const role_names = rolesInput.split(',').map((r) => r.trim()).filter(Boolean);
    setBusyId(contact.id);
    setError(null);
    try {
      const updated = await updateContact(clientId, contact.id, { role_names });
      if (updated) setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
      setEditingRolesId(null);
    }
  }

  async function handleDelete(contact: Contact) {
    if (!await confirm(`Delete "${contact.name}"?`)) return;
    setError(null);
    try {
      await deleteContact(clientId, contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const canDelete = (contact: Contact) => !contact.primary && contacts.length > 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contacts</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Add Contact
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone 2</label>
            <input
              type="tel"
              value={form.phone2}
              onChange={(e) => setForm((prev) => ({ ...prev, phone2: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setForm(EMPTY); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {contacts.length > 0 && (
        <ul className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 shadow-sm">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-2">
                  {c.name}
                  {c.primary && (
                    <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-700">Primary</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {[c.email, c.phone, c.phone2].filter(Boolean).join(' · ') || '—'}
                </p>
                {editingRolesId === c.id ? (
                  <input
                    autoFocus
                    value={rolesInput}
                    onChange={(e) => setRolesInput(e.target.value)}
                    onBlur={() => saveRoles(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingRolesId(null);
                    }}
                    placeholder="Billing, Owner, …"
                    className="mt-1 text-xs border-b border-indigo-400 outline-none bg-transparent text-gray-600 w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditingRoles(c)}
                    className="mt-1 flex flex-wrap gap-1"
                  >
                    {(c.roles ?? []).length > 0 ? (
                      c.roles!.map((r) => (
                        <span key={r.id} className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                          {r.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-300 hover:text-indigo-600 underline decoration-dotted underline-offset-2">
                        + add roles
                      </span>
                    )}
                  </button>
                )}
              </div>
              {!c.primary && (
                <button
                  type="button"
                  onClick={() => handleMakePrimary(c)}
                  disabled={busyId === c.id}
                  className="text-xs text-gray-500 hover:text-indigo-600 font-medium flex-shrink-0 disabled:opacity-50"
                >
                  Make Primary
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(c)}
                disabled={!canDelete(c)}
                title={
                  c.primary
                    ? "Can't delete the primary contact — make another contact primary first"
                    : !canDelete(c)
                    ? 'A client must have at least one contact'
                    : undefined
                }
                className="text-red-400 hover:text-red-600 text-xs flex-shrink-0 disabled:opacity-30 disabled:hover:text-red-400 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
