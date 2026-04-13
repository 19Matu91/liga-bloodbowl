import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { Tournament } from '../types';

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const map = {
    DRAFT: 'bg-gray-700 text-gray-300',
    ACTIVE: 'bg-green-900 text-green-300',
    COMPLETED: 'bg-gray-600 text-gray-400',
  };
  const label = { DRAFT: 'Borrador', ACTIVE: 'Activo', COMPLETED: 'Completado' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export default function Home() {
  const [all, setAll] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAll()
      .then(setAll)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const active = all.filter((t) => t.status === 'ACTIVE');
  const upcoming = all.filter(
    (t) => t.status === 'DRAFT' && new Date(t.startDate) > new Date()
  );

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center py-10 border-b border-red-900/30">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
          <span className="text-red-600">Blood Bowl</span> Torneos
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Gestión de torneos de Blood Bowl para la asociación El Dragón de Madera
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/tournaments/new"
            className="bg-red-800 hover:bg-red-700 text-white px-5 py-2 rounded font-medium transition-colors"
          >
            + Nuevo torneo
          </Link>
          <Link
            to="/players"
            className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded font-medium transition-colors"
          >
            Ver jugadores
          </Link>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-center">Cargando torneos…</p>}
      {error && <p className="text-red-400 text-center">Error: {error}</p>}

      {!loading && !error && (
        <>
          {/* Active tournaments */}
          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
              Torneos activos
            </h2>
            {active.length === 0 ? (
              <p className="text-gray-500 italic">No hay torneos activos en este momento.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming tournaments */}
          <section>
            <h2 className="text-xl font-bold text-yellow-500 mb-4">Próximos torneos</h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-500 italic">No hay torneos próximos programados.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="block bg-gray-900 border border-gray-800 hover:border-red-800 rounded-lg p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-white text-sm leading-tight">{t.name}</h3>
        <StatusBadge status={t.status} />
      </div>
      <p className="text-gray-400 text-xs mb-1">
        {t.edition} · {t.year}
      </p>
      <p className="text-gray-500 text-xs">
        {new Date(t.startDate).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      {t._count && (
        <p className="text-gray-600 text-xs mt-2">{t._count.participants} participantes</p>
      )}
    </Link>
  );
}
