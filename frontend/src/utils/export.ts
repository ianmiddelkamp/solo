import { getToken } from '../api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Every export is generated server-side; this just fetches the file as a blob (raw fetch,
// since the response isn't JSON — same pattern as downloadPdf in api/invoices.ts) and saves it,
// mirroring how a browser handles a normal file download. Accepts request overrides so a POST
// body (e.g. the AI summary's purpose/format) can be sent the same way as a plain GET export.
export async function downloadExport(path: string, filename: string, options: RequestInit = {}): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    let message = 'Failed to generate export';
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch (_) { /* response wasn't JSON, e.g. a real file already streamed on success paths */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
