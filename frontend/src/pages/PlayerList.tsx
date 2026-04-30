import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { players as api } from '../api/client';
import type { Player } from '../types';
import { Spinner } from '../components/ui/Spinner';

export default function PlayerList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getAll().then(setPlayers).finally(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-parchment-100">Jugadores</h1>
        <Link to="/players/new" className="btn-primary shrink-0">+ Nuevo jugador</Link>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar jugador…"
        className="input-field max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="md" className="text-parchment-400/40" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-parchment-400 mb-4">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay jugadores registrados'}
          </p>
          {!search && <Link to="/players/new" className="btn-primary">Añadir el primero</Link>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/players/${p.id}`}
              className="card p-4 hover:border-verde-500/40 transition-all duration-150 group flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-verde-500/10 border border-verde-500/20 flex items-center justify-center text-verde-500 font-display font-bold text-sm shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-parchment-100 group-hover:text-verde-500 transition-colors truncate">
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
