import { _respond } from '../../services/dialog';
import type { DialogOptions } from '../../services/dialog';

export default function ConfirmDialog({ dialog }: { dialog: DialogOptions }) {
  const isConfirm = dialog.type === 'confirm';
  const title = dialog.title ?? (isConfirm ? 'Confirm' : 'Notice');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => isConfirm ? _respond(false) : _respond(true)}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{dialog.message}</p>
        <div className="mt-5 flex justify-end gap-3">
          {isConfirm && (
            <button
              onClick={() => _respond(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => _respond(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isConfirm && dialog.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isConfirm ? (dialog.confirmLabel ?? 'Confirm') : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
