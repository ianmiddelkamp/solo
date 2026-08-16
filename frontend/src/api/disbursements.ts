import { apiFetch } from './index';
import type { Disbursement } from '../types';

const base = (projectId: number) => `/projects/${projectId}/disbursements`;

export const getDisbursements = (projectId: number) => apiFetch<Disbursement[]>(base(projectId));

export const createDisbursement = (projectId: number, data: Partial<Disbursement>) =>
  apiFetch<Disbursement>(base(projectId), { method: 'POST', body: JSON.stringify({ disbursement: data }) });

export const updateDisbursement = (projectId: number, id: number, data: Partial<Disbursement>) =>
  apiFetch<Disbursement>(`${base(projectId)}/${id}`, { method: 'PATCH', body: JSON.stringify({ disbursement: data }) });

export const deleteDisbursement = (projectId: number, id: number) =>
  apiFetch(`${base(projectId)}/${id}`, { method: 'DELETE' });
