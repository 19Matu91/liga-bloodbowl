import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { stats as api } from '../api/client';
import type { GlobalStats, FactionStats } from '../types';
import Th from '../components/ui/Th';
import { Spinner } from '../components/ui/Spinner';

export default function StatsPage() {
  const [tab, setTab] = useState<'global' | 'factions'>('global');
  const [global, setGlobal] = useState<GlobalStats[]>([]);
  const [factions, setFactions] = useState<FactionStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getGlobal(), api.getFactions()])
      .then(([g, f]) => { setGlobal(g); setFactions(f); })
      .finally(() => setLoading(false));
  }, []);

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded transition-all duration-150 ${
      active ? 'bg-verde-500 text-white' : 'text-parchment-400 hover:text-parchment-100 hover:bg-black/5'
    }`;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-parchment-100">Estadísticas</h1>

      <div className="flex gap-2 border-b border-parchment-100/10 pb-4">
        <button className={tabCls(tab === 'global')} onClick={() => setTab('global')}>Ranking global</button>
        <button className={tabCls(tab === 'factions')} onClick={() => setTab('factions')}>Por facción</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="md" className="text-parchment-400/40" /></div>
      ) : tab === 'global' ? (
        <GlobalTable data={global} />
      ) : (
        <FactionTable data={factions} />
      )}
    </div>
  );
}

function GlobalTable({ data }: { data: GlobalStats[] }) {
  if (data.length === 0) return <p className="text-parchment-400 italic text-sm">Sin datos disponibles.</p>;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium text-left">Jugador</th>
              <Th tooltip="Torneos jugados — número de torneos en los que ha participado" className="px-4 py-3 font-medium hidden sm:table-cell">Torneos</Th>
              <Th tooltip="Partidos Jugados — total de partidos disputados en todos los torneos" className="px-4 py-3 font-medium">PJ</Th>
              <Th tooltip="Victorias — partidos ganados. Vale 3 puntos cada una" className="px-4 py-3 font-medium">V</Th>
              <Th tooltip="Empates — partidos terminados en empate. Vale 1 punto cada uno" className="px-4 py-3 font-medium">E</Th>
              <Th tooltip="Derrotas — partidos perdidos. No suman puntos" className="px-4 py-3 font-medium">D</Th>
              <Th tooltip="Puntos totales — calculados como V×3 + E×1 + D×0" className="px-4 py-3 font-medium">Pts</Th>
              <Th tooltip="Diferencia de Touchdowns — TF menos TC. Desempate en caso de igualdad de puntos" className="px-4 py-3 font-medium hidden lg:table-cell">Dif</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={s.playerId} className="table-row">
                <td className="px-4 py-3 text-parchment-400/60 text-center font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link to={`/players/${s.playerId}`} className="text-parchment-100 hover:text-verde-500 transition-colors font-medium">
                    {s.playerName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center text-parchment-400 hidden sm:table-cell">{s.tournamentsPlayed}</td>
                <td className="px-4 py-3 text-center text-parchment-300">{s.played}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-medium">{s.wins}</td>
                <td className="px-4 py-3 text-center text-parchment-400">{s.draws}</td>
                <td className="px-4 py-3 text-center text-dragon-400">{s.losses}</td>
                <td className="px-4 py-3 text-center text-parchment-100 font-bold">{s.points}</td>
                <td className={`px-4 py-3 text-center font-medium hidden lg:table-cell ${s.tdDiff > 0 ? 'text-emerald-600' : s.tdDiff < 0 ? 'text-dragon-400' : 'text-parchment-400'}`}>
                  {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FactionTable({ data }: { data: FactionStats[] }) {
  if (data.filter((f) => f.played > 0).length === 0)
    return <p className="text-parchment-400 italic text-sm">Sin datos disponibles.</p>;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 font-medium text-left">Raza</th>
              <Th tooltip="Veces usada — número de veces que esta raza ha sido elegida en torneos" className="px-4 py-3 font-medium hidden sm:table-cell">Usos</Th>
              <Th tooltip="Partidos Jugados — total de partidos disputados con esta raza" className="px-4 py-3 font-medium">PJ</Th>
              <Th tooltip="Victorias — partidos ganados con esta raza" className="px-4 py-3 font-medium">V</Th>
              <Th tooltip="Empates — partidos terminados en empate con esta raza" className="px-4 py-3 font-medium">E</Th>
              <Th tooltip="Derrotas — partidos perdidos con esta raza" className="px-4 py-3 font-medium">D</Th>
              <Th tooltip="Porcentaje de Victoria — victorias divididas entre partidos jugados (×100)" className="px-4 py-3 font-medium">% V</Th>
            </tr>
          </thead>
          <tbody>
            {data.filter((f) => f.played > 0).map((f) => (
              <tr key={f.raceId} className="table-row">
                <td className="px-4 py-3 text-parchment-100 font-medium">{f.raceName}</td>
                <td className="px-4 py-3 text-center text-parchment-400 hidden sm:table-cell">{f.timesUsed}</td>
                <td className="px-4 py-3 text-center text-parchment-300">{f.played}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-medium">{f.wins}</td>
                <td className="px-4 py-3 text-center text-parchment-400">{f.draws}</td>
                <td className="px-4 py-3 text-center text-dragon-400">{f.losses}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold ${f.winRate >= 50 ? 'text-emerald-600' : 'text-parchment-400'}`}>
                    {f.winRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
