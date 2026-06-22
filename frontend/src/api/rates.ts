import { apiFetch } from './index';
import type { Rate } from '../types';

export const getProjectRate = (projectId: number) => apiFetch<Rate>(`/projects/${projectId}/rate`);
export const setProjectRate = (projectId: number, rate: number) =>
  apiFetch<Rate>(`/projects/${projectId}/rate`, {
    method: 'PUT',
    body: JSON.stringify({ rate: { rate } }),
  });

export const getClientRate = (clientId: number) => apiFetch<Rate>(`/clients/${clientId}/rate`);
export const setClientRate = (clientId: number, rate: number) =>
  apiFetch<Rate>(`/clients/${clientId}/rate`, {
    method: 'PUT',
    body: JSON.stringify({ rate: { rate } }),
  });
