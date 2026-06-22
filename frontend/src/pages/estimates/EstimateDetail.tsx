import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEstimate, updateEstimate, downloadEstimatePdf, regenerateEstimatePdf, sendEstimate } from '../../api/estimates';
import { getBusinessProfile } from '../../api/businessProfile';
import { formatDate } from '../../utils/dates';
import { confirm } from '../../services/dialog';
import type { Estimate, BusinessProfile } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string } | null> = {
  draft:    { label: 'Mark as Sent',     next: 'sent' },
  sent:     { label: 'Mark as Accepted', next: 'accepted' },
  accepted: null,
  declined: null,
};

export default function EstimateDetail() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([getEstimate(id), getBusinessProfile()])
      .then(([est, biz]) => { setEstimate(est); setBusiness(biz); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSend() {
    if (!estimate) return;
    const email = estimate.project?.client?.email1;
    if (!await confirm(`Send estimate to ${email}?`, { title: 'Send Estimate', confirmLabel: 'Send', danger: false })) return;
    setSending(true);
    try {
      const res = await sendEstimate(id);
      if (res) alert(res.message);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadPdf() {
    if (!estimate) return;
    try {
      await downloadEstimatePdf(id, `${estimate.number}.pdf`);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleRegeneratePdf() {
    if (!estimate) return;
    if (!await confirm('Regenerate the PDF? This will overwrite the existing file.', { title: 'Regenerate PDF', confirmLabel: 'Regenerate', danger: false })) return;
    setRegenerating(true);
    try {
      await regenerateEstimatePdf(id);
      await downloadEstimatePdf(id, `${estimate.number}.pdf`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleStatusUpdate() {
    if (!estimate) return;
    const transition = STATUS_TRANSITIONS[estimate.status];
    if (!transition) return;
    try {
      const updated = await updateEstimate(id, { status: transition.next });
      if (updated) setEstimate(updated);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleMarkDeclined() {
    if (!await confirm('Mark this estimate as declined?', { title: 'Mark Declined', confirmLabel: 'Decline', danger: true })) return;
    try {
      const updated = await updateEstimate(id, { status: 'declined' });
      if (updated) setEstimate(updated);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (error)   return <div className="p-8 text-red-600">{error}</div>;
  if (!estimate) return null;

  const brand = business?.primary_color || '#4338ca';
  const transition = STATUS_TRANSITIONS[estimate.status];
  const client = estimate.project?.client;

  const bizAddress = [business?.address1, business?.city, business?.state, business?.postcode].filter(Boolean).join(', ');
  const clientAddress = [client?.address1, client?.city, client?.state, client?.postcode].filter(Boolean).join(', ');

  const footer = business?.estimate_footer || 'This is an estimate only. The final invoice may vary based on actual hours worked.';

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/estimates')} className="text-sm text-gray-500 hover:text-gray-700">
            ← Estimates
          </button>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[estimate.status]}`}>
            {estimate.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {transition && (
            <button
              onClick={handleStatusUpdate}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              {transition.label}
            </button>
          )}
          {estimate.status === 'sent' && (
            <button
              onClick={handleMarkDeclined}
              className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              Mark as Declined
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending…' : 'Send Estimate'}
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Download PDF
          </button>
          <button
            onClick={handleRegeneratePdf}
            disabled={regenerating}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 flex flex-col" style={{ minHeight: '1050px' }}>
        <div className="flex justify-between items-start">
          <div>
            {business?.logo_data_uri ? (
              <img src={business.logo_data_uri} alt={business.name} className="max-h-20 max-w-40 object-contain" />
            ) : (
              <div style={{ color: brand }} className="text-4xl font-bold tracking-tight leading-none">ESTIMATE</div>
            )}
          </div>
          <div className="text-right">
            {business?.logo_data_uri && (
              <div style={{ color: brand }} className="text-2xl font-bold tracking-tight leading-none">ESTIMATE</div>
            )}
            <div className="text-sm font-semibold text-gray-900 mt-1">{estimate.number}</div>
            <div className="text-xs text-gray-500 mt-1">Date: {formatDate(estimate.created_at)}</div>
            {estimate.project?.name && (
              <div className="text-xs text-gray-500 mt-0.5">Project: {estimate.project.name}</div>
            )}
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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Prepared For</p>
            <p className="text-sm font-semibold text-gray-900">{client?.name}</p>
            <div className="text-xs text-gray-500 leading-relaxed mt-1">
              {client?.contact_name && <div>{client.contact_name}</div>}
              {client?.email1 && <div>{client.email1}</div>}
              {client?.phone1 && <div>{client.phone1}</div>}
              {clientAddress && <div>{clientAddress}</div>}
            </div>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: brand }}>
              <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide">Task</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide">Est. Hours</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide">Rate</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.estimate_line_items?.map((item, i) => {
              const done = item.task?.status === 'done';
              const actualHours = done ? (item.task?.actual_hours ?? 0) : null;
              const displayAmount = done ? ((actualHours ?? 0) * item.rate) : item.amount;
              return (
                <tr key={item.id} style={i % 2 === 1 ? { backgroundColor: '#f9fafb' } : {}}>
                  <td className="px-3 py-2 text-sm text-gray-700 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {item.description || '—'}
                      {done && (
                        <span className="inline-flex px-1.5 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700 uppercase tracking-wide">
                          Completed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-right border-b border-gray-200">
                    {done ? (
                      <span className="text-gray-500">est. {item.hours.toFixed(2)} → <strong className="text-gray-900">{actualHours!.toFixed(2)}</strong></span>
                    ) : (
                      <span className="text-gray-900">{item.hours.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right border-b border-gray-200">${item.rate.toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right border-b border-gray-200">${displayAmount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(() => {
          const items = estimate.estimate_line_items || [];
          const itemAmount = (item: typeof items[0]) =>
            item.task?.status === 'done'
              ? (item.task?.actual_hours ?? 0) * item.rate
              : item.amount;
          const subtotal = items.reduce((s, i) => s + itemAmount(i), 0);
          const taxAmount = items.reduce((s, i) => s + itemAmount(i) * parseFloat(i.tax_rate || '0') / 100, 0);
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
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Estimated Total</span>
                  <span className="text-2xl font-bold text-gray-900">${(subtotal + taxAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mt-10 pt-3 border-t border-gray-200 text-xs text-gray-400 leading-relaxed">
          {footer}
          <br />
          Thank you for your business.
        </div>
      </div>

      {estimate.changes && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Changes since last sent</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: brand }}>
                <th className="px-3 py-1.5 text-left font-semibold text-white">Change</th>
                <th className="px-3 py-1.5 text-left font-semibold text-white">Detail</th>
              </tr>
            </thead>
            <tbody>
              {estimate.changes.added?.map((item, i) => (
                <tr key={`added-${i}`} className="border-b border-amber-100">
                  <td className="px-3 py-1.5 text-green-700 font-medium">Added</td>
                  <td className="px-3 py-1.5 text-gray-700">{item.description} ({parseFloat(item.hours).toFixed(2)}h)</td>
                </tr>
              ))}
              {estimate.changes.removed?.map((item, i) => (
                <tr key={`removed-${i}`} className="border-b border-amber-100">
                  <td className="px-3 py-1.5 text-red-600 font-medium">Removed</td>
                  <td className="px-3 py-1.5 text-gray-700">{item.description}</td>
                </tr>
              ))}
              {estimate.changes.changed?.map((item, i) => (
                <tr key={`changed-${i}`} className="border-b border-amber-100">
                  <td className="px-3 py-1.5 text-amber-700 font-medium">Revised</td>
                  <td className="px-3 py-1.5 text-gray-700">
                    {item.description} ({parseFloat(item.old_hours).toFixed(2)}h → {parseFloat(item.new_hours).toFixed(2)}h)
                  </td>
                </tr>
              ))}
              {estimate.changes.completed?.map((item, i) => (
                <tr key={`completed-${i}`} className="border-b border-amber-100">
                  <td className="px-3 py-1.5 text-green-700 font-medium">Completed</td>
                  <td className="px-3 py-1.5 text-gray-700">
                    {item.description} (est. {parseFloat(item.estimated_hours).toFixed(2)}h → actual {parseFloat(item.actual_hours).toFixed(2)}h)
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-3 py-1.5 font-semibold text-gray-700">Total</td>
                <td className="px-3 py-1.5 text-gray-700">
                  ${parseFloat(estimate.changes.previous_total!).toFixed(2)} → ${parseFloat(estimate.changes.current_total!).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
