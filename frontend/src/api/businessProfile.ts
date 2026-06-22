import { apiFetch, getToken } from './index';
import type { BusinessProfile } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getBusinessProfile = () => apiFetch<BusinessProfile>('/business_profile');

export const updateBusinessProfile = (data: Partial<BusinessProfile>) =>
  apiFetch<BusinessProfile>('/business_profile', {
    method: 'PATCH',
    body: JSON.stringify({ business_profile: data }),
  });

export async function uploadBusinessLogo(file: File): Promise<BusinessProfile> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(`${BASE_URL}/business_profile/update_logo`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload logo');
  return res.json();
}

export async function deleteBusinessLogo(): Promise<BusinessProfile> {
  const res = await fetch(`${BASE_URL}/business_profile/destroy_logo`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to remove logo');
  return res.json();
}
