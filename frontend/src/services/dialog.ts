type DialogType = 'confirm' | 'alert' | 'list' | 'payment';

export interface DialogOptions {
  type: DialogType;
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  options?: { label: string; value: string }[];
}

type ShowFn = (dialog: DialogOptions | null) => void;

let _show: ShowFn | null = null;
let _resolve: ((value: unknown) => void) | null = null;

export function _register(show: ShowFn): void {
  _show = show;
}

export function listSelection(message: string, title: string, options: { label: string; value: string }[]): Promise<string> {
  if (!options || options.length === 0) return Promise.reject(new Error('No options provided for listSelection'));
  return new Promise((resolve) => {
    _resolve = resolve as (value: unknown) => void;
    _show!({ type: 'list', message, title, options });
  });
}

export function confirm(
  message: string,
  { title, confirmLabel = 'Confirm', danger = true }: { title?: string; confirmLabel?: string; danger?: boolean } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    _resolve = resolve as (value: unknown) => void;
    _show!({ type: 'confirm', message, title, confirmLabel, danger });
  });
}

export function alert(message: string, { title }: { title?: string } = {}): Promise<void> {
  return new Promise((resolve) => {
    _resolve = resolve as (value: unknown) => void;
    _show!({ type: 'alert', message, title });
  });
}

export function _respond(value: unknown): void {
  const r = _resolve;
  _resolve = null;
  _show!(null);
  r?.(value);
}
