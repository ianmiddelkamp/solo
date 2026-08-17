import { apiFetch } from './index';
import type { Contact } from '../types';

const base = (clientId: number) => `/clients/${clientId}/contacts`;

export const getContacts = (clientId: number) => apiFetch<Contact[]>(base(clientId));

type ContactPayload = Partial<Contact> & { role_names?: string[] };

export const createContact = (clientId: number, data: ContactPayload) =>
  apiFetch<Contact>(base(clientId), { method: 'POST', body: JSON.stringify({ contact: data }) });

export const updateContact = (clientId: number, id: number, data: ContactPayload) =>
  apiFetch<Contact>(`${base(clientId)}/${id}`, { method: 'PATCH', body: JSON.stringify({ contact: data }) });

export const deleteContact = (clientId: number, id: number) =>
  apiFetch(`${base(clientId)}/${id}`, { method: 'DELETE' });
