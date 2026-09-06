import { useState } from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
}

// A small "?" trigger that opens an explanatory sheet — a bottom sheet on mobile (items-end,
// rounded top corners only) and a centered modal on desktop (sm:items-center, rounded all
// around), so one component covers both without extra breakpoint-specific plumbing.
//
// Until it's been opened once, it shimmers briefly on a ~20s cycle (see the help-shimmer
// keyframes in tailwind.config.js) to catch a new user's eye — persisted per-title in
// localStorage, so a button stops drawing attention for good once someone's actually used it.
export default function HelpButton({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const storageKey = `help-seen:${title}`;
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  function handleOpen() {
    setOpen(true);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem(storageKey, '1');
      } catch {
        // localStorage unavailable (private browsing, etc.) — shimmer just won't persist, fine.
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Help: ${title}`}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:text-indigo-600 hover:border-indigo-400 text-xs font-semibold flex-shrink-0 transition-colors ${seen ? '' : 'animate-help-shimmer'}`}
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-3 gap-3">
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
