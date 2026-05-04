import { useState, useEffect } from 'react';
import type { BracketData, Tournament, StandingsEntry } from '../../types';
import GroupStageTable from './GroupStageTable';
import GroupStageMatches from './GroupStageMatches';
import EliminationBracket from './EliminationBracket';
import EliminationBracketTBD from './EliminationBracketTBD';

interface Props {
  bracket: BracketData;
  tournament: Tournament;
  standings: StandingsEntry[];
  onResultSubmitted: () => void;
  onRosterSaved?: () => void;
}

type MixedTab = 'partidos' | 'eliminatoria';

export default function BracketView({ bracket, tournament, standings, onResultSubmitted, onRosterSaved }: Props) {
  const groupRounds = bracket.rounds.filter((r) => r.phase === 'GROUP_STAGE');
  const elimRounds = bracket.rounds.filter((r) => r.phase === 'ELIMINATION');

  // Default tab: si todos los partidos de grupo están completos, abrir eliminatoria
  const allGroupMatchesDone =
    groupRounds.length > 0 && groupRounds.every((r) => r.matches.every((m) => m.status === 'COMPLETED'));

  const [activeTab, setActiveTab] = useState<MixedTab>(
    allGroupMatchesDone ? 'eliminatoria' : 'partidos'
  );

  // Auto-switch to eliminatoria tab once group stage finishes and bracket is generated
  useEffect(() => {
    if (allGroupMatchesDone && elimRounds.length > 0) {
      setActiveTab('eliminatoria');
    }
  }, [allGroupMatchesDone, elimRounds.length]);

  if (bracket.format === 'ROUND_ROBIN') {
    return <GroupStageTable standings={standings} qualifiersPerGroup={null} tournament={tournament} onRosterSaved={onRosterSaved} />;
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

  // MIXED — tabs
  const tabs: Array<{ key: MixedTab; label: string; badge?: string }> = [
    { key: 'partidos', label: 'Partidos' },
    {
      key: 'eliminatoria',
      label: 'Eliminatoria',
      badge: elimRounds.length === 0 ? 'TBD' : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-parchment-100/10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 text-xs font-semibold transition-colors rounded-t
              ${activeTab === tab.key
                ? 'text-parchment-100 border-b-2 border-verde-500 -mb-px bg-verde-500/5'
                : 'text-parchment-400 hover:text-parchment-200'
              }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-parchment-100/10 text-parchment-400/60 leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Clasificación siempre visible */}
      {standings.filter((s) => s.groupNumber != null).length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-parchment-400 uppercase tracking-wider mb-3">Clasificación</h3>
          <GroupStageTable
            standings={standings.filter((s) => s.groupNumber != null)}
            qualifiersPerGroup={tournament.qualifiersPerGroup}
            tournament={tournament}
            onRosterSaved={onRosterSaved}
          />
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'partidos' && (
        <GroupStageMatches
          groupRounds={groupRounds}
          tournament={tournament}
          onResultSubmitted={() => { onResultSubmitted(); }}
          onRosterSaved={onRosterSaved}
        />
      )}

      {activeTab === 'eliminatoria' && (
        elimRounds.length > 0 ? (
          <EliminationBracket
            rounds={elimRounds}
            tournament={tournament}
            onResultSubmitted={onResultSubmitted}
          />
        ) : (
          <EliminationBracketTBD
            groupCount={tournament.groupCount ?? 2}
            qualifiersPerGroup={tournament.qualifiersPerGroup ?? 2}
          />
        )
      )}
    </div>
  );
}
