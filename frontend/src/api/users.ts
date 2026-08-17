import { apiFetch } from './index';
import type { CurrentUser } from './index';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
  archived_at: string | null;
  last_login_at: string | null;
  created_at: string;
  business_name: string | null;
  time_entries_count?: number;
}

export const getUsers = () => apiFetch<ManagedUser[]>('/users');
export const getManagedUser = (id: number) => apiFetch<ManagedUser>(`/users/${id}`);

export const updateManagedUser = (id: number, data: { name?: string; email?: string; role?: string }) =>
  apiFetch<ManagedUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ user: data }) });

export const archiveUser = (id: number) => apiFetch<ManagedUser>(`/users/${id}/archive`, { method: 'POST' });
export const unarchiveUser = (id: number) => apiFetch<ManagedUser>(`/users/${id}/unarchive`, { method: 'POST' });

export const sendPasswordReset = (id: number) =>
  apiFetch<{ message: string }>(`/users/${id}/send_password_reset`, { method: 'POST' });

export const impersonateUser = (id: number) =>
  apiFetch<{ token: string; impersonation_session_id: number; user: CurrentUser }>(`/users/${id}/impersonate`, { method: 'POST' });

export const exitImpersonation = () =>
  apiFetch<{ token: string; user: CurrentUser }>('/impersonation', { method: 'DELETE' });
