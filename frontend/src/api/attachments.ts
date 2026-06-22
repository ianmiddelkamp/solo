import { apiFetch, getToken } from './index';
import type { Attachment } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const base = (projectId: number) => `/projects/${projectId}/attachments`;

export const getAttachments = (projectId: number) => apiFetch<Attachment[]>(base(projectId));

export const uploadAttachment = (projectId: number, file: File): Promise<Attachment> => {
  const body = new FormData();
  body.append('file', file);
  return fetch(`${BASE_URL}${base(projectId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data as Attachment;
  });
};

export const downloadAttachment = async (projectId: number, id: number, filename: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}${base(projectId)}/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const deleteAttachment = (projectId: number, id: number) =>
  apiFetch(`${base(projectId)}/${id}`, { method: 'DELETE' });
