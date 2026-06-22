import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, updateInvoice, deleteInvoice, downloadPdf, regeneratePdf, sendInvoice, markAsPaid, sendReceipt } from '../../api/invoices';
import { getBusinessProfile } from '../../api/businessProfile';
import { formatDate } from '../../utils/dates';
import { confirm } from '../../services/dialog';
import type { Invoice, BusinessProfile, PaymentEntry } from '../../types';
import { DateTime } from 'luxon';
import PaymentDialog from './dialogs/PaymentDialog';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};


export default function InvoiceDetail() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentEntry, setPaymentEntry] = useState<PaymentEntry | null>()

  useEffect(() => {
    Promise.all([getInvoice(id), getBusinessProfile()])
      .then(([inv, biz]) => { setInvoice(inv); setBusiness(biz); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSendInvoice() {
    if (!invoice) return;
    if (!await confirm(`Send invoice to ${invoice.client?.email1}?`, { title: 'Send Invoice', confirmLabel: 'Send', danger: false })) return;
    setSending(true);
    try {
      const res = await sendInvoice(id);
      if (res) alert(res.message);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    try {
      await downloadPdf(id, `${invoice.number}.pdf`);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleRegeneratePdf() {
    if (!invoice) return;
    if (!await confirm('Regenerate the PDF? This will overwrite the existing file.', { title: 'Regenerate PDF', confirmLabel: 'Regenerate', danger: false })) return;
    setRegenerating(true);
    try {
      await regeneratePdf(id);
      await downloadPdf(id, `${invoice.number}.pdf`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDelete() {
    if (!await confirm('Delete this invoice? This cannot be undone.', { title: 'Delete Invoice', confirmLabel: 'Delete' })) return;
    try {
      await deleteInvoice(id);
      navigate('/invoices');
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function openPaymentDialog() {
    if (!invoice) {
      return
    }
    const paymentEntry: PaymentEntry = {
      invoice: invoice,
      paid_at: DateTime.local().toISODate(),
      amount_paid: invoice.total ?? 0
    }
    setPaymentEntry(paymentEntry)
    setShowPaymentDialog(true)
  }

  async function handleMarkAsPaid(payment: PaymentEntry) {
    try {
      const updated = await markAsPaid(id, payment.amount_paid, payment.paid_at ?? undefined);
      setInvoice(updated);
      setPaymentEntry(null)
      setShowPaymentDialog(false);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleSendReceipt() {
    if (!invoice) return;
    if (!await confirm(`Send paid receipt to ${invoice.client?.email1}?`, { title: 'Send Receipt', confirmLabel: 'Send', danger: false })) return;
    setSending(true);
    try {
      const res = await sendReceipt(id);
      if (res) alert(res.message);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }


  async function handleMarkAsSent() {
    if (!invoice) return;
    try {
      const updated = await updateInvoice(id, { status: 'sent' });
      if (updated) setInvoice(updated);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!invoice) return null;

  const brand = business?.primary_color || '#4338ca';

  const bizAddress = [business?.address1, business?.city, business?.state, business?.postcode].filter(Boolean).join(', ');
  const clientAddress = [invoice.client?.address1, invoice.client?.city, invoice.client?.state, invoice.client?.postcode].filter(Boolean).join(', ');

  const periodSubtitle = invoice.start_date && invoice.end_date
    ? `Period: ${formatDate(invoice.start_date)} – ${formatDate(invoice.end_date)}`
    : null;

  const paymentTerms = invoice.client?.sales_terms || business?.default_payment_terms || 'NET 15';
  const footer = business?.invoice_footer || 'Thank you for your business.';

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="text-sm text-gray-500 hover:text-gray-700">
            ← Invoices
          </button>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[invoice.status]}`}>
            {invoice.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {invoice.status === 'pending' && (
            <button
              onClick={handleMarkAsSent}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              Mark as Sent
            </button>
          )}
          <button
            onClick={handleSendInvoice}
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send Invoice'}
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Download PDF
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={openPaymentDialog}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Mark As Paid
            </button>
          )}
          {invoice.status === 'paid' && (
            <button
              onClick={handleSendReceipt}
              disabled={sending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending…' : 'Send Receipt'}
            </button>
          )}
          <button
            onClick={handleRegeneratePdf}
            disabled={regenerating}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-200 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 flex flex-col relative overflow-hidden" style={{ minHeight: '1050px' }}>
        {invoice.status === 'paid' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            fontSize: '96px', fontWeight: 900, letterSpacing: '0.1em',
            color: 'rgba(34,197,94,0.2)', pointerEvents: 'none', zIndex: 10,
            userSelect: 'none',
          }}>
            PAID
          </div>
        )}
        <div className="flex justify-between items-start">
          <div>
            {business?.logo_data_uri ? (
              <img src={business.logo_data_uri} alt={business.name} className="max-h-20 max-w-40 object-contain" />
            ) : (
              <div style={{ color: brand }} className="text-4xl font-bold tracking-tight leading-none">INVOICE</div>
            )}
          </div>
          <div className="text-right">
            {business?.logo_data_uri && (
              <div style={{ color: brand }} className="text-2xl font-bold tracking-tight leading-none">INVOICE</div>
            )}
            <div className="text-sm font-semibold text-gray-900 mt-1">{invoice.number}</div>
            <div className="text-xs text-gray-500 mt-1">Date: {formatDate(invoice.created_at)}</div>
            {periodSubtitle && <div className="text-xs text-gray-500 mt-0.5">{periodSubtitle}</div>}
          </div>
        </div>

        <div style={{ borderTop: `2px solid ${brand}`, margin: '16px 0' }} />

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">From</p>
            <p className="text-sm font-semibold text-gray-900">{business?.name || 'Your Business'}</p>
            <div className="text-xs text-gray-500 leading-relaxed mt-1">
              {bizAddress && <div>{bizAddress}</div>}
              {business?.email && <div>{business.email}</div>}
              {business?.phone && <div>{business.phone}</div>}
              {business?.hst_number && <div>HST # {business.hst_number}</div>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bill To</p>
            <p className="text-sm font-semibold text-gray-900">{invoice.client?.name}</p>
            <div className="text-xs text-gray-500 leading-relaxed mt-1">
              {invoice.client?.contact_name && <div>{invoice.client.contact_name}</div>}
              {invoice.client?.email1 && <div>{invoice.client.email1}</div>}
              {invoice.client?.phone1 && <div>{invoice.client.phone1}</div>}
              {clientAddress && <div>{clientAddress}</div>}
            </div>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: brand }}>
              <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide">Project</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide">Description</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide">Hours</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide">Rate</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_line_items?.map((item, i) => (
              <tr key={item.id} style={i % 2 === 1 ? { backgroundColor: '#f9fafb' } : {}}>
                <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200">{formatDate(item.time_entry?.date)}</td>
                <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200">
                  {item.time_entry?.project?.name || item.time_entry?.charge_code?.code || '—'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200">{item.description || '—'}</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-right border-b border-gray-200">{item.hours.toFixed(2)}</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-right border-b border-gray-200">${item.rate.toFixed(2)}</td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right border-b border-gray-200">${item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(() => {
          const items = invoice.invoice_line_items || [];
          const subtotal = items.reduce((s, i) => s + i.amount, 0);
          const taxAmount = items.reduce((s, i) => s + i.amount * parseFloat(i.tax_rate || '0') / 100, 0);
          const taxRate = items.find((i) => parseFloat(i.tax_rate || '0') > 0)?.tax_rate;
          return (
            <div className="mt-auto flex justify-end pt-4">
              <div className="text-right space-y-1">
                {taxAmount > 0 && <>
                  <div className="flex justify-between gap-16">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm text-gray-700">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-16">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">
                      HST ({parseFloat(taxRate!).toFixed(0)}%){business?.hst_number ? ` · Reg# ${business.hst_number}` : ''}
                    </span>
                    <span className="text-sm text-gray-700">${taxAmount.toFixed(2)}</span>
                  </div>
                </>}
                <div className="flex justify-between gap-16 pt-1 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-bold text-gray-900">${(invoice.total || 0).toFixed(2)}</span>
                </div>
                {invoice.status === 'paid' && <>
                  <div className="flex justify-between gap-16 pt-1 border-t border-gray-200">
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Amount Paid</span>
                    <span className="text-sm text-green-600 font-medium">${(invoice.amount_paid || 0).toFixed(2)}</span>
                  </div>
                  {invoice.paid_at && (
                    <div className="flex justify-between gap-16">
                      <span className="text-xs text-gray-500 uppercase tracking-widest">Payment Date</span>
                      <span className="text-sm text-gray-700">{formatDate(invoice.paid_at)}</span>
                    </div>
                  )}
                </>}
              </div>
            </div>
          );
        })()}

        <div className="mt-10 pt-3 border-t border-gray-200 text-xs text-gray-400 leading-relaxed">
          Payment terms: <strong className="text-gray-500">{paymentTerms}</strong>
          <br />
          {footer}
        </div>
      </div>
      {showPaymentDialog && (
        <PaymentDialog
          payment={paymentEntry!}
          onSubmit={handleMarkAsPaid}
          onCancel={() => setShowPaymentDialog(false)}
        />
      )}
    </div>


  );
}
