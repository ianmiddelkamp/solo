import { apiFetch } from './index';
import type { CurrentUser } from './index';

export interface Invitation {
  id: number;
  email: string;
  name: string;
  invite_sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export const getInvitations = () => apiFetch<Invitation[]>('/invitations');

export const createInvitation = (email: string) =>
  apiFetch<Invitation>('/invitations', { method: 'POST', body: JSON.stringify({ invitation: { email } }) });

export const deleteInvitation = (id: number) =>
  apiFetch<void>(`/invitations/${id}`, { method: 'DELETE' });

export const resendInvitation = (id: number) =>
  apiFetch<Invitation>(`/invitations/${id}/resend`, { method: 'POST' });

export const getInvitationByToken = (token: string) =>
  apiFetch<{ email: string }>(`/invitations/${token}`);

export const acceptInvitation = (token: string, name: string, password: string) =>
  apiFetch<{ token: string; user: CurrentUser }>(`/invitations/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
