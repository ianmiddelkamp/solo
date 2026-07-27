import { apiFetch } from './index';
import type { CcaAsset } from '../types';

export const getCcaAssets = (year?: number) =>
  apiFetch<CcaAsset[]>(`/cca_assets${year ? `?year=${year}` : ''}`);

export const createCcaAsset = (data: Partial<CcaAsset>) =>
  apiFetch<CcaAsset>('/cca_assets', { method: 'POST', body: JSON.stringify({ cca_asset: data }) });

export const updateCcaAsset = (id: number, data: Partial<CcaAsset>) =>
  apiFetch<CcaAsset>(`/cca_assets/${id}`, { method: 'PATCH', body: JSON.stringify({ cca_asset: data }) });

export const deleteCcaAsset = (id: number) =>
  apiFetch(`/cca_assets/${id}`, { method: 'DELETE' });
