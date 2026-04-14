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
  const [homeCas, setHomeCas] = useState(match.homeCas ?? 0);
  const [awayCas, setAwayCas] = useState(match.awayCas ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isUpdate = match.status === 'COMPLETED';
  const homeName = match.homeParticipant?.player.name ?? 'BYE';
  const awayName = match.awayParticipant?.player.name ?? 'BYE';

  const doSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await matchesApi.submitResult(match.id, Number(homeTDs), Number(awayTDs), Number(homeCas), Number(awayCas));
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
      <form onSubmit={handleSubmit} className="bg-carbon-900 border border-parchment-100/10 rounded-lg p-3 mt-2 space-y-3">
        {error && <p className="text-dragon-400 text-xs">{error}</p>}

        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2 text-xs text-parchment-400 text-center">
          <span className="text-right font-medium text-parchment-200 truncate">{homeName}</span>
          <span className="text-parchment-400/40">TD</span>
          <span className="text-parchment-400/40">–</span>
          <span className="text-parchment-400/40">TD</span>
          <span className="text-left font-medium text-parchment-200 truncate">{awayName}</span>
        </div>

        {/* TDs row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
          <div />
          <input
            type="number" value={homeTDs}
            onChange={(e) => setHomeTDs(Number(e.target.value))}
            min={0} max={99}
            className="w-12 bg-white/5 border border-parchment-100/20 focus:border-verde-500 text-parchment-100 text-center rounded px-1 py-1.5 text-sm outline-none transition-colors"
          />
          <span className="text-parchment-400/40 text-xs text-center">–</span>
          <input
            type="number" value={awayTDs}
            onChange={(e) => setAwayTDs(Number(e.target.value))}
            min={0} max={99}
            className="w-12 bg-white/5 border border-parchment-100/20 focus:border-verde-500 text-parchment-100 text-center rounded px-1 py-1.5 text-sm outline-none transition-colors"
          />
          <div />
        </div>

        {/* Bajas row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
          <span className="text-right text-parchment-400/60 text-xs">Bajas</span>
          <input
            type="number" value={homeCas}
            onChange={(e) => setHomeCas(Number(e.target.value))}
            min={0} max={99}
            className="w-12 bg-white/5 border border-parchment-100/20 focus:border-terracota-500 text-parchment-100 text-center rounded px-1 py-1.5 text-xs outline-none transition-colors"
          />
          <span className="text-parchment-400/40 text-xs text-center">–</span>
          <input
            type="number" value={awayCas}
            onChange={(e) => setAwayCas(Number(e.target.value))}
            min={0} max={99}
            className="w-12 bg-white/5 border border-parchment-100/20 focus:border-terracota-500 text-parchment-100 text-center rounded px-1 py-1.5 text-xs outline-none transition-colors"
          />
          <span className="text-left text-parchment-400/60 text-xs">Bajas</span>
        </div>

        <div className="flex gap-2 pt-1 border-t border-parchment-100/10 justify-center">
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
