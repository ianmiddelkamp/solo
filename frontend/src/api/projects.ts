import { apiFetch } from './index';
import type { Project } from '../types';

export const getProjects = (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<Project[]>(`/projects${qs ? `?${qs}` : ''}`);
}
export const getProject = (id: number) => apiFetch<Project>(`/projects/${id}`);
export const createProject = (data: Partial<Project>) => apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify({ project: data }) });
export const updateProject = (id: number, data: Partial<Project>) => apiFetch<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ project: data }) });
export const deleteProject = (id: number) => apiFetch(`/projects/${id}`, { method: 'DELETE' });
export const toggleArchive = (id: number, is_archived: boolean) => apiFetch<{ success?: boolean, errors?: any }>(`/projects/${id}/archive`, { method: "PATCH", body: JSON.stringify({ is_archived: is_archived }) })

export interface AiSummaryPurpose {
  key: string;
  label: string;
}

// Only one purpose exists today (project_brief), but this is kept as a list so more can be
// added later without changing how the request is made.
export const AI_SUMMARY_PURPOSES: AiSummaryPurpose[] = [
  { key: 'project_brief', label: 'Project Brief' },
];
