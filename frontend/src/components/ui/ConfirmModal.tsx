import { Spinner } from './Spinner';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative card w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <h2 className="font-display text-parchment-100 font-bold text-lg">{title}</h2>
        <p className="text-parchment-300 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`${danger ? 'btn-danger' : 'btn-primary'} inline-flex items-center gap-1.5`}
          >
            {loading && <Spinner size="sm" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
