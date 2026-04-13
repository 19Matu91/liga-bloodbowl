import type { StandingsEntry } from '../../types';

interface Props {
  standings: StandingsEntry[];
  qualifiersPerGroup: number | null | undefined;
}

export default function GroupStageTable({ standings, qualifiersPerGroup }: Props) {
  if (standings.length === 0) {
    return <p className="text-parchment-400 italic text-sm">Sin clasificación disponible.</p>;
  }

  // Group by groupNumber
  const groups = new Map<number | null | undefined, StandingsEntry[]>();
  for (const s of standings) {
    const g = s.groupNumber;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([groupNum, entries]) => (
        <div key={groupNum ?? 'all'}>
          {groups.size > 1 && (
            <h4 className="text-xs font-bold text-parchment-400 uppercase tracking-wider mb-2">
              Grupo {groupNum ?? '—'}
            </h4>
          )}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2.5 font-medium w-8">#</th>
                    <th className="px-3 py-2.5 font-medium text-left">Jugador</th>
                    <th className="px-3 py-2.5 font-medium text-left hidden sm:table-cell">Equipo</th>
                    <th className="px-3 py-2.5 font-medium text-left hidden md:table-cell">Raza</th>
                    <th className="px-3 py-2.5 font-medium text-center">PJ</th>
                    <th className="px-3 py-2.5 font-medium text-center">V</th>
                    <th className="px-3 py-2.5 font-medium text-center">E</th>
                    <th className="px-3 py-2.5 font-medium text-center">D</th>
                    <th className="px-3 py-2.5 font-medium text-center">Pts</th>
                    <th className="px-3 py-2.5 font-medium text-center hidden lg:table-cell">TF</th>
                    <th className="px-3 py-2.5 font-medium text-center hidden lg:table-cell">TC</th>
                    <th className="px-3 py-2.5 font-medium text-center hidden lg:table-cell">Dif</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((s, i) => {
                    const isQualifier = qualifiersPerGroup != null && i < qualifiersPerGroup;
                    return (
                      <tr
                        key={s.participantId}
                        className={`table-row ${isQualifier ? 'bg-emerald-50' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          {isQualifier
                            ? <span className="text-emerald-600 font-bold text-xs">{i + 1}</span>
                            : <span className="text-parchment-400/60 text-xs">{i + 1}</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-parchment-100 font-medium">{s.playerName}</td>
                        <td className="px-3 py-2.5 text-parchment-400 hidden sm:table-cell">{s.teamName ?? '—'}</td>
                        <td className="px-3 py-2.5 text-parchment-400 hidden md:table-cell">{s.raceName}</td>
                        <td className="px-3 py-2.5 text-center text-parchment-300">{s.played}</td>
                        <td className="px-3 py-2.5 text-center text-emerald-600 font-medium">{s.wins}</td>
                        <td className="px-3 py-2.5 text-center text-parchment-400">{s.draws}</td>
                        <td className="px-3 py-2.5 text-center text-dragon-400">{s.losses}</td>
                        <td className="px-3 py-2.5 text-center text-parchment-100 font-bold">{s.points}</td>
                        <td className="px-3 py-2.5 text-center text-parchment-400 hidden lg:table-cell">{s.tdFor}</td>
                        <td className="px-3 py-2.5 text-center text-parchment-400 hidden lg:table-cell">{s.tdAgainst}</td>
                        <td className={`px-3 py-2.5 text-center font-medium hidden lg:table-cell ${s.tdDiff > 0 ? 'text-emerald-600' : s.tdDiff < 0 ? 'text-dragon-400' : 'text-parchment-400'}`}>
                          {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
