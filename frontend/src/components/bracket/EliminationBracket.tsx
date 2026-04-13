import { useState } from 'react';
import type { Round, Match, Tournament } from '../../types';
import MatchResultForm from './MatchResultForm';

interface Props {
  rounds: Round[];
  tournament: Tournament;
  onResultSubmitted: () => void;
}

function MatchCard({
  match,
  tournament,
  onResultSubmitted,
}: {
  match: Match;
  tournament: Tournament;
  onResultSubmitted: () => void;
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
    <div className="bg-gray-900 border border-gray-700 rounded min-w-[180px] max-w-[220px]">
      {/* Home */}
      <div className={`px-3 py-2 border-b border-gray-700 flex items-center justify-between gap-2 ${homeWon ? 'bg-green-950/30' : ''}`}>
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${homeWon ? 'text-green-300' : 'text-white'}`}>
            {homeName}
          </p>
          {homeTeam && <p className="text-gray-500 text-xs truncate">{homeTeam}</p>}
        </div>
        {isCompleted && (
          <span className={`text-sm font-bold shrink-0 ${homeWon ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-gray-500'}`}>
            {match.homeTDs}
          </span>
        )}
      </div>
      {/* Away */}
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${awayWon ? 'bg-green-950/30' : ''}`}>
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${awayWon ? 'text-green-300' : 'text-white'}`}>
            {awayName}
          </p>
          {awayTeam && <p className="text-gray-500 text-xs truncate">{awayTeam}</p>}
        </div>
        {isCompleted && (
          <span className={`text-sm font-bold shrink-0 ${awayWon ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-gray-500'}`}>
            {match.awayTDs}
          </span>
        )}
      </div>

      {/* Register result button */}
      {canRegister && !showForm && match.homeParticipantId && match.awayParticipantId && (
        <div className="px-3 py-1.5 border-t border-gray-700">
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            {isCompleted ? 'Editar resultado' : 'Registrar resultado'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="px-3 pb-3 border-t border-gray-700">
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
    return <p className="text-gray-500 italic text-sm">No hay fase eliminatoria generada.</p>;
  }

  const getRoundLabel = (roundIndex: number, total: number) => {
    const fromEnd = total - roundIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semifinales';
    if (fromEnd === 3) return 'Cuartos de final';
    return `Ronda ${rounds[roundIndex].number}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.map((round, ri) => (
          <div key={round.id} className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-yellow-400 text-center uppercase tracking-wide">
              {getRoundLabel(ri, rounds.length)}
            </h4>
            <div className="flex flex-col justify-around gap-4 flex-1">
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
