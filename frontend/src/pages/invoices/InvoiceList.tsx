import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice } from '../../api/invoices';
import PageHeader from '../../components/PageHeader';
import { confirm } from '../../services/dialog';
import { formatDate } from '../../utils/dates';
import type { Invoice } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvoices()
      .then((data) => { if (data) setInvoices(data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!await confirm('Delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Invoices" actionLabel="+ New Invoice" actionTo="/invoices/new" />

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">No invoices yet.</td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{inv.client?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {inv.start_date && inv.end_date
                      ? `${formatDate(inv.start_date)} – ${formatDate(inv.end_date)}`
                      : formatDate(inv.start_date)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${inv.total != null ? `${inv.total?.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[inv.status] ?? ''}`}>
                      {inv.status}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${inv.outstanding != null ? `${inv.outstanding.toFixed(2)}` : '—'}
                  </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {inv.paid_at != null ?  formatDate(inv.paid_at)  : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:text-indigo-800">View</Link>
                    <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
