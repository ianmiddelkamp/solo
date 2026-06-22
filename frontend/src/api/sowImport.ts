import { getToken } from './index';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const parseSow = async (
  projectId: number,
  fileOrText: File | string,
  onStatus?: (msg: string) => void
): Promise<{ title: string; tasks: { title: string }[] }> => {
  const body = new FormData();
  if (typeof fileOrText === 'string') {
    body.append('text', fileOrText);
  } else {
    body.append('file', fileOrText);
  }
  onStatus?.('Analysing document…');
  const res = await fetch(`${BASE_URL}/projects/${projectId}/sow_import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return data;
};
