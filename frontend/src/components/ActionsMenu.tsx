import { useEffect, useRef, useState } from 'react';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

const VARIANT_CLASSES: Record<NonNullable<ActionMenuItem['variant']>, string> = {
  default: 'text-gray-700',
  primary: 'text-indigo-600 font-medium',
  danger: 'text-red-600',
};

/**
 * Collapses a row of action buttons into a single "⋮" menu — used on Estimate/Invoice detail
 * pages where up to 6 conditional buttons (Send/Download/Mark as Paid/Regenerate/Delete...) don't
 * fit a narrow screen. Callers render the normal button row at wider viewports and this menu
 * below the breakpoint, from the same list of actions, so there's one source of truth for what
 * actions exist and only the presentation differs.
 */
export default function ActionsMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Actions"
        aria-expanded={open}
        className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              disabled={item.disabled}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[item.variant ?? 'default']}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
