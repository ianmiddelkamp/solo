import { DateTime, Duration } from 'luxon';

export const today = (): string => DateTime.now().toISODate() ?? '';

export const firstOfMonth = (): string => DateTime.now().startOf('month').toISODate()?? '';

export const formatDate = (str: string | null): string =>
  str ? DateTime.fromISO(str).toLocal().toFormat('MMM d, yyyy') : '—';

export const formatDateTime = (str: string | null): string =>
  str ? DateTime.fromISO(str).toLocal().toFormat('MMM d, yyyy HH:mm') : '—';

export const elapsedSeconds = (startedAt: string):number =>
  Math.floor(DateTime.now().diff(DateTime.fromISO(startedAt), 'seconds').seconds);

export const formatElapsed = (seconds:number): string =>
  Duration.fromObject({ seconds }).toFormat('hh:mm:ss');

export const hoursFromRange = (startedAt:string, stoppedAt:string): number =>
  parseFloat(
    DateTime.fromISO(stoppedAt).diff(DateTime.fromISO(startedAt), 'hours').hours.toFixed(2)
  );
