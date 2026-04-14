import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { Tournament } from '../types';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  ACTIVE: 'Activo', COMPLETED: 'Finalizado',
};
const FORMAT_LABEL: Record<Tournament['format'], string> = {
  MIXED: 'Mixto', SINGLE_ELIMINATION: 'Eliminación', ROUND_ROBIN: 'Liguilla',
};

export default function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAll().then(setTournaments).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-parchment-100">Torneos</h1>
        <Link to="/tournaments/new" className="btn-primary">+ Nuevo torneo</Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-parchment-400">Cargando…</div>
      ) : tournaments.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-parchment-400 mb-4">No hay torneos registrados</p>
          <Link to="/tournaments/new" className="btn-primary">Crear el primero</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/tournaments/${t.id}`}
              className="card p-4 flex items-center justify-between gap-4 hover:border-verde-500/40 transition-all duration-150 group block"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-parchment-100 group-hover:text-verde-500 transition-colors">
                    {t.name}
                  </span>
                  <span className={t.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="text-parchment-400 text-xs mt-0.5">
                  {t.edition} · {t.year} · {FORMAT_LABEL[t.format]}
                  {(t._count?.participants ?? 0) > 0 && ` · ${t._count?.participants} participantes`}
                </p>
              </div>
              <div className="text-parchment-400/50 text-xs shrink-0 hidden sm:block">
                {new Date(t.startDate).toLocaleDateString('es-ES')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
