import { apiFetch } from './index';

export interface Features {
  sow_import: boolean;
}

export function getFeatures() {
  return apiFetch<Features>('/features');
}
