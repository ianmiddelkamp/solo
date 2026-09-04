import { getToken } from '../api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Every export is generated server-side; this just fetches the file as a blob (raw fetch,
// since the response isn't JSON — same pattern as downloadPdf in api/invoices.ts) and saves it,
// mirroring how a browser handles a normal file download.
export async function downloadExport(path: string, filename: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to generate export');
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
