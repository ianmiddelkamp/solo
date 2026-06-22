import { apiFetch } from './index';
import type { Client } from '../types';

export const getClients = () => apiFetch<Client[]>('/clients');
export const getClient = (id: number) => apiFetch<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>) => apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify({ client: data }) });
export const updateClient = (id: number, data: Partial<Client>) => apiFetch<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify({ client: data }) });
export const deleteClient = (id: number) => apiFetch(`/clients/${id}`, { method: 'DELETE' });
