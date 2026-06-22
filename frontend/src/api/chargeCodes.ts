import { apiFetch } from './index';
import type { ChargeCode } from '../types';

export const getChargeCodes = () => apiFetch<ChargeCode[]>('/charge_codes');

export const createChargeCode = (data: Partial<ChargeCode>) =>
  apiFetch<ChargeCode>('/charge_codes', { method: 'POST', body: JSON.stringify({ charge_code: data }) });

export const updateChargeCode = (id: number, data: Partial<ChargeCode>) =>
  apiFetch<ChargeCode>(`/charge_codes/${id}`, { method: 'PATCH', body: JSON.stringify({ charge_code: data }) });

export const deleteChargeCode = (id: number) =>
  apiFetch(`/charge_codes/${id}`, { method: 'DELETE' });
