interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-white font-bold text-lg">{title}</h2>
        <p className="text-gray-400 text-sm">{message}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded text-sm transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors text-white ${
              danger ? 'bg-red-800 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
