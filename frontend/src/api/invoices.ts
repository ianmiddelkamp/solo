import { apiFetch, getToken } from './index';
import type { Invoice, TimeEntry } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Listing & fetching ────────────────────────────────────────────────────────

export const getInvoices = () =>
  apiFetch<Invoice[]>('/invoices');

export const getInvoice = (id: number) =>
  apiFetch<Invoice>(`/invoices/${id}`);

export const getUnbilledEntries = (clientId: number, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams({ client_id: String(clientId) });
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return apiFetch<TimeEntry[]>(`/invoices/unbilled_entries?${params}`);
};

// ── Creating & updating ───────────────────────────────────────────────────────

export const createInvoice = (data: unknown) =>
  apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) });

export const updateInvoice = (id: number, data: Partial<Invoice>) =>
  apiFetch<Invoice>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ invoice: data }) });

export const deleteInvoice = (id: number) =>
  apiFetch(`/invoices/${id}`, { method: 'DELETE' });

// ── Payment ───────────────────────────────────────────────────────────────────

export const markAsPaid = (id: number, amountPaid: number, paidAt?: string) =>
  apiFetch<Invoice>(`/invoices/${id}/mark_as_paid`, {
    method: 'POST',
    body: JSON.stringify({ payment: { amount_paid: amountPaid, paid_at: paidAt } }),
  });

// ── PDF & sending ─────────────────────────────────────────────────────────────

export const sendInvoice = (id: number) =>
  apiFetch<{ message: string }>(`/invoices/${id}/send_invoice`, { method: 'POST' });


export const sendReceipt = (id: number) =>
  apiFetch<{ message: string }>(`/invoices/${id}/send_receipt`, { method: 'POST' });

export const regeneratePdf = (id: number) =>
  apiFetch(`/invoices/${id}/regenerate_pdf`, { method: 'POST' });

// Uses raw fetch because the response is a binary blob, not JSON.
export async function downloadPdf(id: number, filename?: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/invoices/${id}/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to download PDF');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${id}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
