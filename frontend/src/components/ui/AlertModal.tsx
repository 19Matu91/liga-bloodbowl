interface Props {
  title?: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ title = 'Error', message, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-red-400 font-bold text-lg">{title}</h2>
        <p className="text-gray-300 text-sm">{message}</p>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
