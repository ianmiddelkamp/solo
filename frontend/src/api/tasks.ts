import { apiFetch } from './index';
import type { TaskGroup, Task } from '../types';

const base = (projectId: number) => `/projects/${projectId}/task_groups`;
const tasksBase = (projectId: number, groupId: number) => `${base(projectId)}/${groupId}/tasks`;

export const getTaskGroups = (projectId: number) => apiFetch<TaskGroup[]>(base(projectId));

export const createTaskGroup = (projectId: number, data: Partial<TaskGroup>) =>
  apiFetch<TaskGroup>(base(projectId), { method: 'POST', body: JSON.stringify({ task_group: data }) });

export const updateTaskGroup = (projectId: number, id: number, data: Partial<TaskGroup>) =>
  apiFetch<TaskGroup>(`${base(projectId)}/${id}`, { method: 'PATCH', body: JSON.stringify({ task_group: data }) });

export const deleteTaskGroup = (projectId: number, id: number) =>
  apiFetch(`${base(projectId)}/${id}`, { method: 'DELETE' });

export const reorderTaskGroups = (projectId: number, ids: number[]) =>
  apiFetch(`${base(projectId)}/reorder`, { method: 'PATCH', body: JSON.stringify({ ids }) });

export const createTask = (projectId: number, groupId: number, data: Partial<Task>) =>
  apiFetch<Task>(tasksBase(projectId, groupId), { method: 'POST', body: JSON.stringify({ task: data }) });

export const updateTask = (projectId: number, groupId: number, id: number, data: Partial<Task>) =>
  apiFetch<Task>(`${tasksBase(projectId, groupId)}/${id}`, { method: 'PATCH', body: JSON.stringify({ task: data }) });

export const deleteTask = (projectId: number, groupId: number, id: number) =>
  apiFetch(`${tasksBase(projectId, groupId)}/${id}`, { method: 'DELETE' });

export const reorderTasks = (projectId: number, groupId: number, ids: number[], targetGroupId: number) =>
  apiFetch(`${tasksBase(projectId, groupId)}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ ids, target_group_id: targetGroupId }),
  });
