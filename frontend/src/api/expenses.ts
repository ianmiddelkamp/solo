import { apiFetch, getToken } from './index';
import type { Expense } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getExpenses = (params?: { start?: string; end?: string; category?: string }) => {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString() : '';
  return apiFetch<Expense[]>(`/expenses${qs}`);
};

export const createExpense = ({ receipt_blob_signed_id, ...data }: Partial<Expense> & { receipt_blob_signed_id?: string }) =>
  apiFetch<Expense>('/expenses', { method: 'POST', body: JSON.stringify({ expense: data, receipt_blob_signed_id }) });

export const updateExpense = (id: number, { receipt_blob_signed_id, ...data }: Partial<Expense> & { receipt_blob_signed_id?: string }) =>
  apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify({ expense: data, receipt_blob_signed_id }) });

export const deleteExpense = (id: number) =>
  apiFetch(`/expenses/${id}`, { method: 'DELETE' });

export interface ParsedReceipt {
  date: string | null;
  vendor: string | null;
  description: string | null;
  amount: number | null;
  hst_paid: number | null;
  category: string | null;
  receipt_blob_signed_id: string;
}

export async function parseReceipt(file: File): Promise<ParsedReceipt> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${BASE_URL}/expenses/parse_receipt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to parse receipt');
  return data;
}

export async function fetchReceiptObjectUrl(expenseId: number): Promise<string> {
  const res = await fetch(`${BASE_URL}/expenses/${expenseId}/receipt`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to load receipt');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
