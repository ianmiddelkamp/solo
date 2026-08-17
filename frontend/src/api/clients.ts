import { apiFetch } from './index';
import type { Client, Contact } from '../types';

export const getClients = () => apiFetch<Client[]>('/clients');
export const getClient = (id: number) => apiFetch<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>, contact: Partial<Contact>) =>
  apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify({ client: data, contact }) });
export const updateClient = (id: number, data: Partial<Client>) => apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify({ client: data }) });
export const deleteClient = (id: number) => apiFetch(`/clients/${id}`, { method: 'DELETE' });
