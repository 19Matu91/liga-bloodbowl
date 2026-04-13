import { useState } from 'react';
import { matches as matchesApi } from '../../api/client';
import type { Match } from '../../types';

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

  const isUpdate = match.status === 'COMPLETED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdate && !window.confirm('Este partido ya tiene resultado. ¿Deseas modificarlo?')) return;
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

  const homeName = match.homeParticipant?.player.name ?? 'BYE';
  const awayName = match.awayParticipant?.player.name ?? 'BYE';

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-600 rounded p-3 mt-2 space-y-2">
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white font-medium flex-1 text-right truncate">{homeName}</span>
        <input
          type="number"
          value={homeTDs}
          onChange={(e) => setHomeTDs(Number(e.target.value))}
          min={0}
          max={99}
          className="w-12 bg-gray-900 border border-gray-600 text-white text-center rounded px-1 py-1 text-sm outline-none"
        />
        <span className="text-gray-500">–</span>
        <input
          type="number"
          value={awayTDs}
          onChange={(e) => setAwayTDs(Number(e.target.value))}
          min={0}
          max={99}
          className="w-12 bg-gray-900 border border-gray-600 text-white text-center rounded px-1 py-1 text-sm outline-none"
        />
        <span className="text-white font-medium flex-1 truncate">{awayName}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs transition-colors"
        >
          {submitting ? 'Guardando…' : isUpdate ? 'Actualizar' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
