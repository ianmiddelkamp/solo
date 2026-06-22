const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
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

  if (res.status === 401) {
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
