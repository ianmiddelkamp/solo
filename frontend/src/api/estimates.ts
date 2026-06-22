import { apiFetch, getToken } from './index';
import type { Estimate } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getEstimates = (projectId?: number) => {
  const url = projectId ? `/estimates?project_id=${projectId}` : '/estimates';
  return apiFetch<Estimate[]>(url);
};
export const getEstimate = (id: number) => apiFetch<Estimate>(`/estimates/${id}`);
export const createEstimate = (data: unknown) =>
  apiFetch<Estimate>('/estimates', { method: 'POST', body: JSON.stringify(data) });
export const updateEstimate = (id: number, data: Partial<Estimate>) =>
  apiFetch<Estimate>(`/estimates/${id}`, { method: 'PATCH', body: JSON.stringify({ estimate: data }) });
export const deleteEstimate = (id: number) => apiFetch(`/estimates/${id}`, { method: 'DELETE' });
export const regenerateEstimatePdf = (id: number) => apiFetch(`/estimates/${id}/regenerate_pdf`, { method: 'POST' });
export const sendEstimate = (id: number) => apiFetch<{ message: string }>(`/estimates/${id}/send_estimate`, { method: 'POST' });

export async function downloadEstimatePdf(id: number, filename?: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/estimates/${id}/pdf`, {
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
