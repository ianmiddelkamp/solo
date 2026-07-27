import { apiFetch } from './index';
import type { T2125Report } from '../types';

export const getT2125Report = (year: number) => apiFetch<T2125Report>(`/t2125?year=${year}`);
