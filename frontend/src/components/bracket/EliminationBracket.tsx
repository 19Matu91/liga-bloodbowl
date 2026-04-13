import { useState } from 'react';
import type { Round, Match, Tournament } from '../../types';
import MatchResultForm from './MatchResultForm';

interface Props {
  rounds: Round[];
  tournament: Tournament;
  onResultSubmitted: () => void;
}

function MatchCard({ match, tournament, onResultSubmitted }: {
  match: Match; tournament: Tournament; onResultSubmitted: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const homeName = match.homeParticipant?.player.name ?? 'BYE';
  const awayName = match.awayParticipant?.player.name ?? 'BYE';
  const homeTeam = match.homeParticipant?.teamName;
  const awayTeam = match.awayParticipant?.teamName;
  const isCompleted = match.status === 'COMPLETED';
  const canRegister = tournament.status === 'ACTIVE';
  const homeWon = isCompleted && match.winnerId === match.homeParticipantId;
  const awayWon = isCompleted && match.winnerId === match.awayParticipantId;
  const isDraw = isCompleted && match.winnerId === null;

  return (
    <div className="card min-w-[190px] max-w-[230px] overflow-hidden">
      {/* Home */}
      <div className={`px-3 py-2.5 border-b border-parchment-100/10 flex items-center justify-between gap-2 ${homeWon ? 'bg-emerald-50' : ''}`}>
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${homeWon ? 'text-emerald-700' : 'text-parchment-100'}`}>
            {homeName}
          </p>
          {homeTeam && <p className="text-parchment-400/60 text-xs truncate">{homeTeam}</p>}
        </div>
        {isCompleted && (
          <span className={`text-sm font-bold shrink-0 ${homeWon ? 'text-emerald-600' : isDraw ? 'text-parchment-300' : 'text-parchment-400/50'}`}>
            {match.homeTDs}
          </span>
        )}
      </div>
      {/* Away */}
      <div className={`px-3 py-2.5 flex items-center justify-between gap-2 ${awayWon ? 'bg-emerald-50' : ''}`}>
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${awayWon ? 'text-emerald-700' : 'text-parchment-100'}`}>
            {awayName}
          </p>
          {awayTeam && <p className="text-parchment-400/60 text-xs truncate">{awayTeam}</p>}
        </div>
        {isCompleted && (
          <span className={`text-sm font-bold shrink-0 ${awayWon ? 'text-emerald-600' : isDraw ? 'text-parchment-300' : 'text-parchment-400/50'}`}>
            {match.awayTDs}
          </span>
        )}
      </div>

      {canRegister && !showForm && match.homeParticipantId && match.awayParticipantId && (
        <div className="px-3 py-1.5 border-t border-parchment-100/10">
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-verde-500 hover:text-verde-400 transition-colors"
          >
            {isCompleted ? 'Editar resultado' : '+ Registrar resultado'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="px-3 pb-3 border-t border-parchment-100/10">
          <MatchResultForm
            match={match}
            onSuccess={() => { setShowForm(false); onResultSubmitted(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function EliminationBracket({ rounds, tournament, onResultSubmitted }: Props) {
  if (rounds.length === 0) {
    return <p className="text-parchment-400 italic text-sm">No hay fase eliminatoria generada.</p>;
  }

  const getRoundLabel = (i: number, total: number) => {
    const fromEnd = total - i;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semifinales';
    if (fromEnd === 3) return 'Cuartos de final';
    return `Ronda ${rounds[i].number}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max items-start">
        {rounds.map((round, ri) => (
          <div key={round.id} className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-parchment-400 uppercase tracking-wider text-center">
              {getRoundLabel(ri, rounds.length)}
            </h4>
            <div className="flex flex-col justify-around gap-6 flex-1">
              {round.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  tournament={tournament}
                  onResultSubmitted={onResultSubmitted}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
