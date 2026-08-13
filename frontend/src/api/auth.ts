import { apiFetch } from './index';
import type { CurrentUser } from './index';

export function login(email: string, password: string) {
  return apiFetch<{ token: string; user: CurrentUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
