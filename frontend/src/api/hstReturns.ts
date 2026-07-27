import { apiFetch } from './index';
import type { HstReturn, HstCalculation } from '../types';

export const getHstReturns = () => apiFetch<HstReturn[]>('/hst_returns');

export const getHstReturn = (id: number) => apiFetch<HstReturn>(`/hst_returns/${id}`);

export const calculateHstReturn = (periodStart: string, periodEnd: string) =>
  apiFetch<HstCalculation>(`/hst_returns/calculate?period_start=${periodStart}&period_end=${periodEnd}`);

export const createHstReturn = (data: Partial<HstReturn> & { auto_calculate?: boolean }) =>
  apiFetch<HstReturn>('/hst_returns', { method: 'POST', body: JSON.stringify({ hst_return: data, auto_calculate: data.auto_calculate }) });

export const updateHstReturn = (id: number, data: Partial<HstReturn>) =>
  apiFetch<HstReturn>(`/hst_returns/${id}`, { method: 'PATCH', body: JSON.stringify({ hst_return: data }) });

export const deleteHstReturn = (id: number) =>
  apiFetch(`/hst_returns/${id}`, { method: 'DELETE' });
