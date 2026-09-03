import { apiFetch } from './index';
import type { Client, Contact } from '../types';

export const getClients = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Client[]>(`/clients${qs ? `?${qs}` : ''}`);
}
export const getClient = (id: number) => apiFetch<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>, contact: Partial<Contact>) =>
  apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify({ client: data, contact }) });
export const updateClient = (id: number, data: Partial<Client>) => apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify({ client: data }) });
export const archiveClient = (id: number, is_archived: boolean) => apiFetch<{ success?: boolean, errors?: any }>(`/clients/${id}/archive`, { method: "PATCH", body: JSON.stringify({ client: { is_archived } }) })
