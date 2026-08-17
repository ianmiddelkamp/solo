import { useState } from 'react';
import type { Contact } from '../types';

interface Props {
  title: string;
  contacts: Contact[];
  defaultContactId?: number;
  confirmLabel?: string;
  onSubmit: (contactId: number) => void;
  onCancel: () => void;
}

export default function ContactPickerDialog({ title, contacts, defaultContactId, confirmLabel = 'Send', onSubmit, onCancel }: Props) {
  const [contactId, setContactId] = useState(defaultContactId ?? contacts[0]?.id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (contactId != null) onSubmit(contactId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
        <form onSubmit={submit}>
          <div className="space-y-2">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-start gap-3 p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                <input
                  type="radio"
                  name="contact_id"
                  checked={contactId === c.id}
                  onChange={() => setContactId(c.id)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {c.name}
                    {c.primary && <span className="ml-2 text-xs text-indigo-600 font-normal">(Primary)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{c.email || 'No email on file'}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={contactId == null}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
