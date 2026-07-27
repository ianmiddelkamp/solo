import { apiFetch } from './index';
import type { HomeOfficeProfile } from '../types';

export const getHomeOfficeProfile = () => apiFetch<HomeOfficeProfile | null>('/home_office_profile');

export const updateHomeOfficeProfile = (data: Partial<HomeOfficeProfile>) =>
  apiFetch<HomeOfficeProfile>('/home_office_profile', { method: 'PATCH', body: JSON.stringify({ home_office_profile: data }) });
