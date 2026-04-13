import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { Tournament } from '../types';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
};

const STATUS_CLASS: Record<Tournament['status'], string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  ACTIVE: 'bg-green-900 text-green-300',
  COMPLETED: 'bg-gray-600 text-gray-400',
};

const FORMAT_LABEL: Record<Tournament['format'], string> = {
  MIXED: 'Mixto',
  SINGLE_ELIMINATION: 'Eliminación directa',
  ROUND_ROBIN: 'Liguilla',
};

export default function TournamentList() {
  const [list, setList] = useState<Tournament[]>([]);
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
        <h1 className="text-2xl font-bold text-white">Torneos</h1>
        <Link
          to="/tournaments/new"
          className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          + Nuevo torneo
        </Link>
      </div>

      {loading && <p className="text-gray-400">Cargando…</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {!loading && !error && list.length === 0 && (
        <p className="text-gray-500 italic">No hay torneos registrados.</p>
      )}

      {!loading && !error && list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="pb-3 pr-4 font-medium">Torneo</th>
                <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Edición</th>
                <th className="pb-3 pr-4 font-medium hidden md:table-cell">Formato</th>
                <th className="pb-3 pr-4 font-medium">Fecha inicio</th>
                <th className="pb-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="text-white hover:text-red-400 font-medium transition-colors"
                    >
                      {t.name}
                    </Link>
                    <span className="text-gray-500 text-xs ml-2">{t.year}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 hidden sm:table-cell">{t.edition}</td>
                  <td className="py-3 pr-4 text-gray-400 hidden md:table-cell">
                    {FORMAT_LABEL[t.format]}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {new Date(t.startDate).toLocaleDateString('es-ES')}
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
