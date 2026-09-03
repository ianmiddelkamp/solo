import type { Key, ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Omit this column from the mobile card view — for secondary detail that fits a wide table
   * fine but would just add clutter to a stacked card (e.g. raw timestamps alongside a
   * human-friendly date). Desktop table is unaffected. */
  hideOnCard?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => Key;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Rendered as the trailing actions column on desktop, and as a small action row on each
   * mobile card. Receives the row so callers can build Edit/Delete/View links inline. */
  actions?: (row: T) => ReactNode;
}

/**
 * One definition of a list, two renderings: a normal `<table>` at md+ (unchanged from how every
 * list page looked before), and stacked "label: value" cards below md. Column definitions
 * (label + how to render a cell) are shared between both, so there's one source of truth instead
 * of hand-building a separate mobile layout per page.
 */
export default function ResponsiveTable<T>({
  columns, rows, keyExtractor, onRowClick, emptyMessage = 'No results.', actions,
}: ResponsiveTableProps<T>) {
  const clickable = Boolean(onRowClick);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Desktop / tablet: normal table, horizontal scroll as a last resort rather than clipping */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-6 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 ${clickable ? 'cursor-pointer' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-6 py-4 text-sm ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.render(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 text-right text-sm space-x-3" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per row, every column as a label/value line */}
      <div className="md:hidden divide-y divide-gray-200">
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-400">{emptyMessage}</p>}
        {rows.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={`p-4 ${clickable ? 'active:bg-gray-50 cursor-pointer' : ''}`}
          >
            <dl className="space-y-1.5">
              {columns.filter((c) => !c.hideOnCard).map((c) => (
                <div key={c.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0">{c.label}</dt>
                  <dd className="text-sm text-gray-900 text-right min-w-0">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
            {actions && (
              <div className="mt-3 flex items-center gap-4 text-sm" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
