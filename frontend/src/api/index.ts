const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('impersonating');
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
}

export function getUser(): CurrentUser | null {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as CurrentUser) : null;
}

export function setUser(user: CurrentUser): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function isAdmin(): boolean {
  return getUser()?.role === 'admin';
}

// Set right after a successful impersonate/exit call — the JWT itself is what actually carries
// impersonation server-side, this flag is purely local UI state so the banner knows to render.
export function isImpersonating(): boolean {
  return localStorage.getItem('impersonating') === '1';
}

export function setImpersonating(value: boolean): void {
  if (value) localStorage.setItem('impersonating', '1');
  else localStorage.removeItem('impersonating');
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T | null> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  // Only auto-clear and redirect when a token was actually sent and got rejected — i.e. a
  // previously-valid session going stale mid-use. A request made with no token (a login attempt,
  // a public token-consumption endpoint) can also legitimately 401 for reasons that have nothing
  // to do with an expired session (wrong password, expired reset link) — those should just fall
  // through to the normal error handling below so the caller's own catch block sees the message,
  // instead of hard-navigating away and silently discarding whatever the user had typed.
  if (res.status === 401 && token) {
    clearToken();
    window.location.href = '/login';
    return null;
  }

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = await res.json();
      if (body.errors) message = Object.values<string[]>(body.errors).flat().join(', ');
      else if (body.error) message = body.error;
    } catch (_) {}
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json() as Promise<T>;
}
