import { apiFetch } from './index';
import type { TimerSession, TimeEntry } from '../types';

export const getTimer = () => apiFetch<TimerSession>('/timer');

export const startTimer = (projectId: number, taskId: number | null) =>
  apiFetch<TimerSession>('/timer/start', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, task_id: taskId || null }),
  });

export const stopTimer = (projectId: number, description: string) =>
  apiFetch<{ timer_session: TimerSession; time_entry: TimeEntry }>('/timer/stop', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, description }),
  });

export const updateTimer = (description: string, taskId?: number | null) =>
  apiFetch<TimerSession>('/timer', {
    method: 'PATCH',
    body: JSON.stringify({ description, ...(taskId !== undefined && { task_id: taskId }) }),
  });

export const cancelTimer = () => apiFetch('/timer', { method: 'DELETE' });
