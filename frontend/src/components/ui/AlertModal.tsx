interface Props {
  title?: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ title = 'Error', message, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-carbon-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="text-dragon-500 text-lg">⚠</span>
          <h2 className="font-display text-dragon-400 font-bold text-lg">{title}</h2>
        </div>
        <p className="text-parchment-300 text-sm leading-relaxed">{message}</p>
        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
