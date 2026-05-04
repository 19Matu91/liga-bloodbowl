import { useState } from 'react';
import type { Round, Match, Tournament } from '../../types';
import MatchResultForm from './MatchResultForm';
import RosterModal from '../RosterModal';

interface Props {
  groupRounds: Round[];
  tournament: Tournament;
  onResultSubmitted: () => void;
  onRosterSaved?: () => void;
}

function MatchRow({ match, tournament, onResultSubmitted, onViewRoster }: {
  match: Match; tournament: Tournament; onResultSubmitted: () => void; onViewRoster: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const homeName = match.homeParticipant?.player.name ?? 'BYE';
  const awayName = match.awayParticipant?.player.name ?? 'BYE';
  const homeTeam = match.homeParticipant?.teamName;
  const awayTeam = match.awayParticipant?.teamName;
  const isCompleted = match.status === 'COMPLETED';
  const canRegister = tournament.status === 'ACTIVE' && match.homeParticipantId && match.awayParticipantId;
  const homeWon = isCompleted && match.winnerId === match.homeParticipantId;
  const awayWon = isCompleted && match.winnerId === match.awayParticipantId;
  const isDraw = isCompleted && match.winnerId === null;

  return (
    <div>
      {/* Fixture row */}
      <div className="relative flex items-center px-4 py-3 min-h-[44px] hover:bg-parchment-100/[0.03] transition-colors">

        {/* Trio centrado con absolute para ignorar el botón */}
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center pointer-events-auto">

            {/* Home — right aligned */}
            <div className="w-28 sm:w-44 md:w-56 text-right pr-3 sm:pr-4 min-w-0">
              <button
                onClick={() => match.homeParticipantId && onViewRoster(match.homeParticipantId)}
                disabled={!match.homeParticipantId}
                className={`text-xs font-semibold truncate block w-full text-right transition-colors disabled:cursor-default ${
                  isCompleted
                    ? homeWon ? 'text-parchment-100 hover:text-verde-400' : isDraw ? 'text-parchment-300 hover:text-parchment-100' : 'text-parchment-400/40 hover:text-parchment-300'
                    : 'text-parchment-200 hover:text-verde-400'
                }`}>
                {homeName}
              </button>
              {homeTeam && <p className="text-parchment-400/40 text-[10px] truncate">{homeTeam}</p>}
            </div>

            {/* Score */}
            <div className="flex flex-col items-center shrink-0 w-16">
              {isCompleted ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-base font-bold w-5 text-right ${homeWon ? 'text-parchment-100' : isDraw ? 'text-parchment-300' : 'text-parchment-400/40'}`}>
                      {match.homeTDs}
                    </span>
                    <span className="text-parchment-400/30 text-xs">—</span>
                    <span className={`font-mono text-base font-bold w-5 text-left ${awayWon ? 'text-parchment-100' : isDraw ? 'text-parchment-300' : 'text-parchment-400/40'}`}>
                      {match.awayTDs}
                    </span>
                  </div>
                  {(match.homeCas != null || match.awayCas != null) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-dragon-400/50 w-5 text-right">{match.homeCas ?? 0}</span>
                      <span className="text-parchment-400/20 text-[9px]">·</span>
                      <span className="font-mono text-[10px] text-dragon-400/50 w-5 text-left">{match.awayCas ?? 0}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-base text-parchment-400/20 w-5 text-right">·</span>
                  <span className="text-parchment-400/20 text-xs">—</span>
                  <span className="font-mono text-base text-parchment-400/20 w-5 text-left">·</span>
                </div>
              )}
            </div>

            {/* Away — left aligned */}
            <div className="w-28 sm:w-44 md:w-56 text-left pl-3 sm:pl-4 min-w-0">
              <button
                onClick={() => match.awayParticipantId && onViewRoster(match.awayParticipantId)}
                disabled={!match.awayParticipantId}
                className={`text-xs font-semibold truncate block w-full text-left transition-colors disabled:cursor-default ${
                  isCompleted
                    ? awayWon ? 'text-parchment-100 hover:text-verde-400' : isDraw ? 'text-parchment-300 hover:text-parchment-100' : 'text-parchment-400/40 hover:text-parchment-300'
                    : 'text-parchment-200 hover:text-verde-400'
                }`}>
                {awayName}
              </button>
              {awayTeam && <p className="text-parchment-400/40 text-[10px] truncate">{awayTeam}</p>}
            </div>
          </div>
        </div>

        {/* Botón — extremo derecho, fuera del flujo del trio */}
        <div className="ml-auto shrink-0">
          {canRegister && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className={`text-[10px] font-medium transition-colors px-2 py-1 rounded ${
                isCompleted
                  ? 'text-parchment-400/50 hover:text-parchment-300'
                  : 'text-verde-500 hover:text-verde-400 border border-verde-500/30 hover:border-verde-500/60'
              }`}
            >
              {isCompleted ? 'Editar' : '+ Resultado'}
            </button>
          )}
        </div>
      </div>

      {/* Inline result form */}
      {showForm && (
        <div className="mx-4 mb-3">
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

export default function GroupStageMatches({ groupRounds, tournament, onResultSubmitted, onRosterSaved }: Props) {
  const [rosterParticipantId, setRosterParticipantId] = useState<number | null>(null);
  if (groupRounds.length === 0) return null;

  // Group rounds by round.number → Jornadas
  const byJornada = new Map<number, Round[]>();
  for (const round of groupRounds) {
    if (!byJornada.has(round.number)) byJornada.set(round.number, []);
    byJornada.get(round.number)!.push(round);
  }

  const jornadas = Array.from(byJornada.entries()).sort(([a], [b]) => a - b);

  // Default: first jornada with pending matches, or last jornada if all done
  const defaultOpen = (() => {
    for (const [num, rounds] of jornadas) {
      if (rounds.some((r) => r.matches.some((m) => m.status === 'PENDING'))) return num;
    }
    return jornadas[jornadas.length - 1]?.[0] ?? 1;
  })();

  const [openJornada, setOpenJornada] = useState<number>(defaultOpen);

  // Within a jornada, group matches by groupNumber
  const matchesByGroup = (rounds: Round[]): Map<number, Match[]> => {
    const map = new Map<number, Match[]>();
    for (const round of rounds) {
      for (const match of round.matches) {
        const g = match.homeParticipant?.groupNumber ?? match.awayParticipant?.groupNumber ?? 0;
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(match);
      }
    }
    return map;
  };

  return (
    <>
    {rosterParticipantId !== null && (
      <RosterModal
        participantId={rosterParticipantId}
        canEdit={tournament.status === 'ACTIVE'}
        onClose={() => setRosterParticipantId(null)}
        onSaved={onRosterSaved}
      />
    )}
    <div className="space-y-1.5">
      {jornadas.map(([jornada, rounds]) => {
        const isOpen = openJornada === jornada;
        const allDone = rounds.every((r) => r.matches.every((m) => m.status === 'COMPLETED'));
        const groupsMap = matchesByGroup(rounds);
        const groups = Array.from(groupsMap.entries()).sort(([a], [b]) => a - b);
        const totalMatches = groups.reduce((acc, [, ms]) => acc + ms.length, 0);
        const completedMatches = groups.reduce(
          (acc, [, ms]) => acc + ms.filter((m) => m.status === 'COMPLETED').length, 0
        );

        return (
          <div key={jornada} className="card overflow-hidden">
            {/* Accordion header */}
            <button
              type="button"
              onClick={() => setOpenJornada(isOpen ? -1 : jornada)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-parchment-100/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-parchment-100 tracking-tight">
                  Jornada {jornada}
                </span>
                <span className="text-[10px] text-parchment-400/50 font-mono">
                  {completedMatches}/{totalMatches}
                </span>
                {allDone && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-verde-500/15 text-verde-400 font-semibold leading-none border border-verde-500/20">
                    ✓ Completada
                  </span>
                )}
              </div>
              <span className={`text-parchment-400/40 text-xs transition-transform duration-200 group-hover:text-parchment-400 ${isOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {/* Accordion content */}
            {isOpen && (
              <div className="border-t border-parchment-100/8">
                {groups.map(([groupNum, matches], gi) => (
                  <div key={groupNum}>
                    {/* Group separator — only if multiple groups */}
                    {groups.length > 1 && (
                      <div className="flex items-center gap-3 px-4 pt-3 pb-1">
                        <span className="text-[10px] font-bold text-parchment-400/40 uppercase tracking-widest">
                          Grupo {String.fromCharCode(64 + groupNum)}
                        </span>
                        <div className="flex-1 h-px bg-parchment-100/8" />
                      </div>
                    )}

                    {/* Match rows */}
                    <div className={gi < groups.length - 1 ? 'pb-2' : 'pb-1'}>
                      {matches.map((match, mi) => (
                        <div key={match.id} className={mi < matches.length - 1 ? 'border-b border-parchment-100/5' : ''}>
                          <MatchRow
                            match={match}
                            tournament={tournament}
                            onResultSubmitted={onResultSubmitted}
                            onViewRoster={setRosterParticipantId}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
    </>
  );
}
