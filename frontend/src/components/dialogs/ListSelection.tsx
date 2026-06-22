import { useState } from 'react';
import { _respond } from '../../services/dialog';
import type { DialogOptions } from '../../services/dialog';

export default function ListSelectionDialog({ dialog }: { dialog: DialogOptions }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const title = dialog.title ?? 'Select an option';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{dialog.message}</p>

        {dialog.options && dialog.options.length > 0 && (
          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); _respond(selectedOption); }}>
            {dialog.options.map((option, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="radio"
                  name="options"
                  value={option.value}
                  onChange={() => setSelectedOption(option.value)}
                  id={`option-${index}`}
                />
                <label className="ml-2" htmlFor={`option-${index}`}>{option.label}</label>
              </div>
            ))}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => _respond(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              >
                Accept
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
