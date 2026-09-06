import { apiFetch } from './index';
import type { Contact } from '../types';

const base = (clientId: number) => `/clients/${clientId}/contacts`;

export const getContacts = (clientId: number, params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<Contact[]>(`${base(clientId)}${qs ? `?${qs}` : ''}`);
};

type ContactPayload = Partial<Contact> & { role_names?: string[] };

export const createContact = (clientId: number, data: ContactPayload) =>
  apiFetch<Contact>(base(clientId), { method: 'POST', body: JSON.stringify({ contact: data }) });

export const updateContact = (clientId: number, id: number, data: ContactPayload) =>
  apiFetch<Contact>(`${base(clientId)}/${id}`, { method: 'PATCH', body: JSON.stringify({ contact: data }) });

export const archiveContact = (clientId: number, id: number, is_archived: boolean) =>
  apiFetch<Contact>(`${base(clientId)}/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ contact: { is_archived } }) });
