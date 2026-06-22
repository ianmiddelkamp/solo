import { apiFetch } from './index';
import type { TimeEntry } from '../types';

export const getTimeEntries = (projectId: number) =>
  apiFetch<TimeEntry[]>(`/projects/${projectId}/time_entries`);

export const createTimeEntry = (projectId: number, data: Partial<TimeEntry>) =>
  apiFetch<TimeEntry>(`/projects/${projectId}/time_entries`, {
    method: 'POST',
    body: JSON.stringify({ time_entry: { ...data, user_id: 1 } }),
  });

export const updateTimeEntry = (projectId: number, id: number, data: Partial<TimeEntry>) =>
  apiFetch<TimeEntry>(`/projects/${projectId}/time_entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ time_entry: data }),
  });

export const deleteTimeEntry = (projectId: number, id: number) =>
  apiFetch(`/projects/${projectId}/time_entries/${id}`, { method: 'DELETE' });

export const getAllTimeEntries = async (params: Record<string, string> = {}): Promise<TimeEntry[]> => {
  const qs = new URLSearchParams(params).toString();
  const entries = await apiFetch<TimeEntry[]>(`/time_entries${qs ? `?${qs}` : ''}`);
  if (!entries) return [];
  entries.forEach((entry) => {
    entry.hours = entry.hours ? parseFloat(entry.hours as unknown as string) : 0;
  });
  return entries;
};

export const getTimeEntry = (id: number) => apiFetch<TimeEntry>(`/time_entries/${id}`);

export const createChargeCodeTimeEntry = (data: Partial<TimeEntry>) =>
  apiFetch<TimeEntry>('/time_entries', {
    method: 'POST',
    body: JSON.stringify({ time_entry: { ...data, user_id: 1 } }),
  });

export const updateChargeCodeTimeEntry = (id: number, data: Partial<TimeEntry>) =>
  apiFetch<TimeEntry>(`/time_entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ time_entry: data }),
  });

export const deleteChargeCodeTimeEntry = (id: number) =>
  apiFetch(`/time_entries/${id}`, { method: 'DELETE' });
