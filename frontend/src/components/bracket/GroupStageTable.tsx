import { useState } from 'react';
import type { StandingsEntry, Tournament } from '../../types';
import RosterModal from '../RosterModal';
import Th from '../ui/Th';

interface Props {
  standings: StandingsEntry[];
  qualifiersPerGroup: number | null | undefined;
  tournament?: Tournament;
}

const groupLetter = (n: number | null | undefined) =>
  n != null ? String.fromCharCode(64 + n) : '—';

function GroupTable({
  entries,
  qualifiersPerGroup,
  tournament,
  onViewRoster,
}: {
  entries: StandingsEntry[];
  qualifiersPerGroup: number | null | undefined;
  tournament?: Tournament;
  onViewRoster: (participantId: number) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="px-2 py-2 font-medium w-6 text-center">#</th>
            <th className="px-3 py-2 font-medium text-left">Jugador</th>
            <th className="px-2 py-2 font-medium text-left hidden sm:table-cell">Raza</th>
            <Th tooltip="Partidos Jugados — total de partidos disputados en el torneo" className="px-1 py-2 font-medium w-10">PJ</Th>
            <Th tooltip="Victorias — partidos ganados. Vale 3 puntos cada una" className="px-1 py-2 font-medium w-8">V</Th>
            <Th tooltip="Empates — partidos terminados en empate. Vale 1 punto cada uno" className="px-1 py-2 font-medium w-8 hidden xs:table-cell">E</Th>
            <Th tooltip="Derrotas — partidos perdidos. No suman puntos" className="px-1 py-2 font-medium w-8">D</Th>
            <Th tooltip="Puntos totales — calculados como V×3 + E×1 + D×0" className="px-1 py-2 font-medium w-10">Pts</Th>
            <Th tooltip="Touchdowns a Favor — total de touchdowns anotados por el equipo" className="px-1 py-2 font-medium w-10 hidden sm:table-cell">TF</Th>
            <Th tooltip="Touchdowns en Contra — total de touchdowns recibidos por el equipo" className="px-1 py-2 font-medium w-10 hidden sm:table-cell">TC</Th>
            <Th tooltip="Diferencia de Touchdowns — TF menos TC. Desempate en caso de igualdad de puntos" className="px-1 py-2 font-medium w-10">Dif</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((s, i) => {
            const isQualifier = qualifiersPerGroup != null && i < qualifiersPerGroup;
            return (
              <tr
                key={s.participantId}
                className={`table-row ${isQualifier ? 'bg-verde-500/10 border-l-2 border-verde-500' : ''}`}
              >
                <td className="px-2 py-2.5 text-center">
                  {isQualifier
                    ? <span className="text-verde-400 font-bold text-xs">{i + 1}</span>
                    : <span className="text-parchment-400/60 text-xs">{i + 1}</span>
                  }
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => onViewRoster(s.participantId)}
                      className="text-parchment-100 font-medium hover:text-verde-500 transition-colors text-left"
                    >
                      {s.playerName}
                    </button>
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded leading-none ${s.isVeteran ? 'bg-terracota-500/20 text-terracota-400' : 'bg-verde-500/20 text-verde-400'}`}>
                      {s.isVeteran ? 'V' : 'N'}
                    </span>
                    {s.teamName && (
                      <span className="text-parchment-400/50 text-xs hidden sm:inline">{s.teamName}</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-parchment-400 text-xs hidden sm:table-cell">{s.raceName}</td>
                <td className="px-1 py-2.5 text-center text-parchment-300 text-xs">{s.played}</td>
                <td className="px-1 py-2.5 text-center text-verde-400 font-medium text-xs">{s.wins}</td>
                <td className="px-1 py-2.5 text-center text-parchment-400 text-xs hidden xs:table-cell">{s.draws}</td>
                <td className="px-1 py-2.5 text-center text-dragon-400 text-xs">{s.losses}</td>
                <td className="px-1 py-2.5 text-center text-parchment-100 font-bold text-xs">{s.points}</td>
                <td className="px-1 py-2.5 text-center text-parchment-400 text-xs hidden sm:table-cell">{s.tdFor}</td>
                <td className="px-1 py-2.5 text-center text-parchment-400 text-xs hidden sm:table-cell">{s.tdAgainst}</td>
                <td className={`px-1 py-2.5 text-center font-medium text-xs ${s.tdDiff > 0 ? 'text-verde-400' : s.tdDiff < 0 ? 'text-dragon-400' : 'text-parchment-400'}`}>
                  {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default function GroupStageTable({ standings, qualifiersPerGroup, tournament }: Props) {
  const [rosterParticipantId, setRosterParticipantId] = useState<number | null>(null);

  if (standings.length === 0) {
    return <p className="text-parchment-400 italic text-sm">Sin clasificación disponible.</p>;
  }

  const groups = new Map<number | null | undefined, StandingsEntry[]>();
  for (const s of standings) {
    const g = s.groupNumber;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  const groupEntries = Array.from(groups.entries()).sort(([a], [b]) => (a ?? 0) - (b ?? 0));

  const canEdit = tournament?.status === 'ACTIVE';

  return (
    <>
      {rosterParticipantId !== null && (
        <RosterModal
          participantId={rosterParticipantId}
          canEdit={canEdit ?? false}
          onClose={() => setRosterParticipantId(null)}
        />
      )}

      {groupEntries.length === 1 ? (
        <GroupTable
          entries={groupEntries[0][1]}
          qualifiersPerGroup={qualifiersPerGroup}
          tournament={tournament}
          onViewRoster={setRosterParticipantId}
        />
      ) : (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(groupEntries.length, 2)}, minmax(0, 1fr))` }}>
      {groupEntries.map(([groupNum, entries]) => (
        <div key={groupNum ?? 'all'}>
          <h4 className="text-xs font-bold text-parchment-400 uppercase tracking-wider mb-2">
            Grupo {groupLetter(groupNum)}
          </h4>
          <GroupTable entries={entries} qualifiersPerGroup={qualifiersPerGroup} tournament={tournament} onViewRoster={setRosterParticipantId} />
        </div>
      ))}
      </div>
      )}
    </>
  );
}
