import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { players as api } from '../api/client';
import type { Player } from '../types';

export default function PlayerList() {
  const [list, setList] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAll()
      .then(setList)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Jugadores</h1>
        <Link
          to="/players/new"
          className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          + Nuevo jugador
        </Link>
      </div>

      {loading && <p className="text-gray-400">Cargando…</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && list.length === 0 && (
        <p className="text-gray-500 italic">No hay jugadores registrados.</p>
      )}

      {!loading && !error && list.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((p) => (
            <Link
              key={p.id}
              to={`/players/${p.id}`}
              className="block bg-gray-900 border border-gray-800 hover:border-red-800 rounded-lg p-4 transition-colors"
            >
              <p className="text-white font-medium">{p.name}</p>
              {p.alias && <p className="text-gray-400 text-sm">"{p.alias}"</p>}
              {p.email && <p className="text-gray-500 text-xs mt-1">{p.email}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
