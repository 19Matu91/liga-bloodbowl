import { useEffect, useState } from 'react';
import { stats as api } from '../api/client';
import type { GlobalStats, FactionStats } from '../types';

type Tab = 'global' | 'factions';

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>('global');
  const [global, setGlobal] = useState<GlobalStats[]>([]);
  const [factions, setFactions] = useState<FactionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getGlobal(), api.getFactions()])
      .then(([g, f]) => { setGlobal(g); setFactions(f); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Estadísticas</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        <TabButton active={tab === 'global'} onClick={() => setTab('global')}>
          Ranking Global
        </TabButton>
        <TabButton active={tab === 'factions'} onClick={() => setTab('factions')}>
          Por Facción
        </TabButton>
      </div>

      {loading && <p className="text-gray-400">Cargando estadísticas…</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && tab === 'global' && <GlobalRanking data={global} />}
      {!loading && !error && tab === 'factions' && <FactionRanking data={factions} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-red-600 text-white'
          : 'border-transparent text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function GlobalRanking({ data }: { data: GlobalStats[] }) {
  if (data.length === 0) return <p className="text-gray-500 italic">Sin datos disponibles.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="pb-2 pr-2 font-medium w-8">Pos</th>
            <th className="pb-2 pr-4 font-medium">Jugador</th>
            <th className="pb-2 pr-3 font-medium text-center hidden sm:table-cell">Torneos</th>
            <th className="pb-2 pr-3 font-medium text-center">PJ</th>
            <th className="pb-2 pr-3 font-medium text-center">V</th>
            <th className="pb-2 pr-3 font-medium text-center">E</th>
            <th className="pb-2 pr-3 font-medium text-center">D</th>
            <th className="pb-2 pr-3 font-medium text-center">Pts</th>
            <th className="pb-2 pr-3 font-medium text-center hidden lg:table-cell">TF</th>
            <th className="pb-2 pr-3 font-medium text-center hidden lg:table-cell">TC</th>
            <th className="pb-2 font-medium text-center hidden lg:table-cell">Dif</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={p.playerId} className="border-b border-gray-800/50">
              <td className="py-2 pr-2 text-gray-500 text-center">{i + 1}</td>
              <td className="py-2 pr-4">
                <span className="text-white font-medium">{p.playerName}</span>
                {p.alias && <span className="text-gray-500 text-xs ml-1">({p.alias})</span>}
              </td>
              <td className="py-2 pr-3 text-center text-gray-400 hidden sm:table-cell">{p.tournamentsPlayed}</td>
              <td className="py-2 pr-3 text-center text-gray-300">{p.played}</td>
              <td className="py-2 pr-3 text-center text-green-400">{p.wins}</td>
              <td className="py-2 pr-3 text-center text-yellow-400">{p.draws}</td>
              <td className="py-2 pr-3 text-center text-red-400">{p.losses}</td>
              <td className="py-2 pr-3 text-center text-white font-bold">{p.points}</td>
              <td className="py-2 pr-3 text-center text-gray-400 hidden lg:table-cell">{p.tdFor}</td>
              <td className="py-2 pr-3 text-center text-gray-400 hidden lg:table-cell">{p.tdAgainst}</td>
              <td className={`py-2 text-center font-medium hidden lg:table-cell ${p.tdDiff > 0 ? 'text-green-400' : p.tdDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {p.tdDiff > 0 ? `+${p.tdDiff}` : p.tdDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FactionRanking({ data }: { data: FactionStats[] }) {
  if (data.length === 0) return <p className="text-gray-500 italic">Sin datos disponibles.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="pb-2 pr-4 font-medium">Raza</th>
            <th className="pb-2 pr-3 font-medium text-center hidden sm:table-cell">Usos</th>
            <th className="pb-2 pr-3 font-medium text-center">PJ</th>
            <th className="pb-2 pr-3 font-medium text-center">V</th>
            <th className="pb-2 pr-3 font-medium text-center">E</th>
            <th className="pb-2 pr-3 font-medium text-center">D</th>
            <th className="pb-2 font-medium text-center">% Vic</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f) => (
            <tr key={f.raceId} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 text-white font-medium">{f.raceName}</td>
              <td className="py-2 pr-3 text-center text-gray-400 hidden sm:table-cell">{f.timesUsed}</td>
              <td className="py-2 pr-3 text-center text-gray-300">{f.played}</td>
              <td className="py-2 pr-3 text-center text-green-400">{f.wins}</td>
              <td className="py-2 pr-3 text-center text-yellow-400">{f.draws}</td>
              <td className="py-2 pr-3 text-center text-red-400">{f.losses}</td>
              <td className="py-2 text-center">
                <span className={`font-bold ${f.winRate >= 50 ? 'text-green-400' : f.winRate >= 33 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {f.winRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
