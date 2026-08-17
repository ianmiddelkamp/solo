import { apiFetch } from './index';
import type { CurrentUser } from './index';

export const getPasswordResetByToken = (token: string) => apiFetch<{ email: string }>(`/password_resets/${token}`);

export const resetPassword = (token: string, password: string) =>
  apiFetch<{ token: string; user: CurrentUser }>(`/password_resets/${token}`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
