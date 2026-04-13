import type { BracketData, Tournament, StandingsEntry } from '../../types';
import GroupStageTable from './GroupStageTable';
import EliminationBracket from './EliminationBracket';

interface Props {
  bracket: BracketData;
  tournament: Tournament;
  standings: StandingsEntry[];
  onResultSubmitted: () => void;
}

export default function BracketView({ bracket, tournament, standings, onResultSubmitted }: Props) {
  const groupRounds = bracket.rounds.filter((r) => r.phase === 'GROUP_STAGE');
  const elimRounds = bracket.rounds.filter((r) => r.phase === 'ELIMINATION');

  if (bracket.format === 'ROUND_ROBIN') {
    return <GroupStageTable standings={standings} qualifiersPerGroup={null} />;
  }

  if (bracket.format === 'SINGLE_ELIMINATION') {
    return (
      <EliminationBracket
        rounds={elimRounds.length > 0 ? elimRounds : bracket.rounds}
        tournament={tournament}
        onResultSubmitted={onResultSubmitted}
      />
    );
  }

  // MIXED
  return (
    <div className="space-y-8">
      {groupRounds.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-parchment-400 uppercase tracking-wider mb-3">Fase de Grupos</h3>
          <GroupStageTable
            standings={standings.filter((s) => s.groupNumber != null)}
            qualifiersPerGroup={tournament.qualifiersPerGroup}
          />
        </div>
      )}
      {elimRounds.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-parchment-400 uppercase tracking-wider mb-3">Fase Eliminatoria</h3>
          <EliminationBracket
            rounds={elimRounds}
            tournament={tournament}
            onResultSubmitted={onResultSubmitted}
          />
        </div>
      )}
    </div>
  );
}
