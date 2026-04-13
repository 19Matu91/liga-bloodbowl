import type { StandingsEntry } from '../../types';

interface Props {
  standings: StandingsEntry[];
  qualifiersPerGroup?: number | null;
}

export default function GroupStageTable({ standings, qualifiersPerGroup }: Props) {
  // Group standings by groupNumber
  const groups = new Map<number | string, StandingsEntry[]>();
  for (const entry of standings) {
    const key = entry.groupNumber ?? 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  // Sort each group by points DESC, tdDiff DESC
  for (const [, entries] of groups) {
    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.tdDiff !== a.tdDiff) return b.tdDiff - a.tdDiff;
      return b.tdFor - a.tdFor;
    });
  }

  const sortedGroups = [...groups.entries()].sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="space-y-6">
      {sortedGroups.map(([groupKey, entries]) => (
        <div key={groupKey}>
          {sortedGroups.length > 1 && (
            <h3 className="text-sm font-bold text-yellow-400 mb-2">
              Grupo {groupKey}
            </h3>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-left">
                  <th className="pb-2 pr-2 font-medium w-8">Pos</th>
                  <th className="pb-2 pr-3 font-medium">Jugador</th>
                  <th className="pb-2 pr-3 font-medium hidden sm:table-cell">Equipo</th>
                  <th className="pb-2 pr-3 font-medium hidden md:table-cell">Raza</th>
                  <th className="pb-2 pr-2 font-medium text-center">PJ</th>
                  <th className="pb-2 pr-2 font-medium text-center">V</th>
                  <th className="pb-2 pr-2 font-medium text-center">E</th>
                  <th className="pb-2 pr-2 font-medium text-center">D</th>
                  <th className="pb-2 pr-2 font-medium text-center">Pts</th>
                  <th className="pb-2 pr-2 font-medium text-center hidden lg:table-cell">TF</th>
                  <th className="pb-2 pr-2 font-medium text-center hidden lg:table-cell">TC</th>
                  <th className="pb-2 font-medium text-center hidden lg:table-cell">Dif</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((s, i) => {
                  const isQualifier = qualifiersPerGroup != null && i < qualifiersPerGroup;
                  return (
                    <tr
                      key={s.participantId}
                      className={`border-b border-gray-800/50 ${isQualifier ? 'bg-green-950/20' : ''}`}
                    >
                      <td className="py-2 pr-2 text-gray-500 text-center">
                        {isQualifier ? (
                          <span className="text-green-400 font-bold">{i + 1}</span>
                        ) : (
                          i + 1
                        )}
                      </td>
                      <td className="py-2 pr-3 text-white font-medium">{s.playerName}</td>
                      <td className="py-2 pr-3 text-gray-400 hidden sm:table-cell">{s.teamName ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-400 hidden md:table-cell">{s.raceName}</td>
                      <td className="py-2 pr-2 text-center text-gray-300">{s.played}</td>
                      <td className="py-2 pr-2 text-center text-green-400">{s.wins}</td>
                      <td className="py-2 pr-2 text-center text-yellow-400">{s.draws}</td>
                      <td className="py-2 pr-2 text-center text-red-400">{s.losses}</td>
                      <td className="py-2 pr-2 text-center text-white font-bold">{s.points}</td>
                      <td className="py-2 pr-2 text-center text-gray-400 hidden lg:table-cell">{s.tdFor}</td>
                      <td className="py-2 pr-2 text-center text-gray-400 hidden lg:table-cell">{s.tdAgainst}</td>
                      <td className={`py-2 text-center font-medium hidden lg:table-cell ${s.tdDiff > 0 ? 'text-green-400' : s.tdDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {qualifiersPerGroup != null && (
            <p className="text-xs text-green-500 mt-1">
              ✓ Los {qualifiersPerGroup} primeros clasifican a la fase eliminatoria
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
