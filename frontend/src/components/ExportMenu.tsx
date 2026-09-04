import { useEffect, useRef, useState } from 'react';

interface ExportOption {
  label: string;
  onClick: () => void;
}

interface ExportMenuProps {
  options: ExportOption[];
}

export default function ExportMenu({ options }: ExportMenuProps) {
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
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
      >
        Export ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => { opt.onClick(); setOpen(false); }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
