import { useState } from 'react';
import { matches as matchesApi } from '../../api/client';
import type { Match } from '../../types';
import ConfirmModal from '../ui/ConfirmModal';

interface Props {
  match: Match;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MatchResultForm({ match, onSuccess, onCancel }: Props) {
  const [homeTDs, setHomeTDs] = useState(match.homeTDs ?? 0);
  const [awayTDs, setAwayTDs] = useState(match.awayTDs ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isUpdate = match.status === 'COMPLETED';

  const doSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await matchesApi.submitResult(match.id, Number(homeTDs), Number(awayTDs));
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar resultado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdate) setShowConfirm(true);
    else doSubmit();
  };

  const homeName = match.homeParticipant?.player.name ?? 'BYE';
  const awayName = match.awayParticipant?.player.name ?? 'BYE';

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Modificar resultado"
          message="Este partido ya tiene resultado. ¿Deseas modificarlo?"
          confirmLabel="Modificar"
          danger={false}
          onConfirm={() => { setShowConfirm(false); doSubmit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <form onSubmit={handleSubmit} className="bg-carbon-900 border border-parchment-100/15 rounded-lg p-3 mt-2 space-y-3">
        {error && <p className="text-dragon-400 text-xs">{error}</p>}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-parchment-100 font-medium flex-1 text-right truncate text-xs">{homeName}</span>
          <input
            type="number"
            value={homeTDs}
            onChange={(e) => setHomeTDs(Number(e.target.value))}
            min={0} max={99}
            className="w-12 bg-carbon-850 border border-parchment-100/20 focus:border-dragon-500 text-parchment-100 text-center rounded px-1 py-1.5 text-sm outline-none transition-colors"
          />
          <span className="text-parchment-400/60 text-xs">–</span>
          <input
            type="number"
            value={awayTDs}
            onChange={(e) => setAwayTDs(Number(e.target.value))}
            min={0} max={99}
            className="w-12 bg-carbon-850 border border-parchment-100/20 focus:border-dragon-500 text-parchment-100 text-center rounded px-1 py-1.5 text-sm outline-none transition-colors"
          />
          <span className="text-parchment-100 font-medium flex-1 truncate text-xs">{awayName}</span>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary text-xs py-1.5 px-3">
            {submitting ? 'Guardando…' : isUpdate ? 'Actualizar' : 'Guardar'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}
