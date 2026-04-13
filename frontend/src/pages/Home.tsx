import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { Tournament } from '../types';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Próximo',
  ACTIVE: 'En curso',
  COMPLETED: 'Finalizado',
};

function TournamentCard({ t }: { t: Tournament }) {
  const isActive = t.status === 'ACTIVE';
  const isDraft = t.status === 'DRAFT';
  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="card p-5 hover:border-dragon-500/40 transition-all duration-200 group block"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display font-bold text-parchment-100 group-hover:text-dragon-400 transition-colors">
          {t.name}
        </h3>
        <span className={isActive ? 'badge-active' : isDraft ? 'badge-draft' : 'badge-completed'}>
          {STATUS_LABEL[t.status]}
        </span>
      </div>
      <p className="text-parchment-400 text-sm">
        {t.edition} · {t.year}
      </p>
      <p className="text-parchment-400/60 text-xs mt-1">
        {new Date(t.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {(t._count?.participants ?? 0) > 0 && (
        <p className="text-parchment-400/60 text-xs mt-2">
          {t._count?.participants} participante{(t._count?.participants ?? 0) !== 1 ? 's' : ''}
        </p>
      )}
    </Link>
  );
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAll().then(setTournaments).finally(() => setLoading(false));
  }, []);

  const active = tournaments.filter((t) => t.status === 'ACTIVE');
  const upcoming = tournaments.filter((t) => t.status === 'DRAFT');
  const past = tournaments.filter((t) => t.status === 'COMPLETED').slice(0, 3);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center py-10 border-b border-parchment-100/10">
        <div className="text-5xl mb-4">🐉</div>
        <h1 className="font-display text-4xl font-bold text-parchment-100 mb-2">
          El Dragón de Madera
        </h1>
        <p className="text-parchment-400 text-lg">Liga de Blood Bowl</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/tournaments/new" className="btn-primary">
            + Nuevo torneo
          </Link>
          <Link to="/players/new" className="btn-secondary">
            + Nuevo jugador
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-parchment-400">Cargando…</div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="section-title flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Torneos en curso
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((t) => <TournamentCard key={t.id} t={t} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="section-title">Próximos torneos</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((t) => <TournamentCard key={t.id} t={t} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="section-title">Torneos recientes</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((t) => <TournamentCard key={t.id} t={t} />)}
              </div>
              {tournaments.filter((t) => t.status === 'COMPLETED').length > 3 && (
                <div className="mt-4 text-center">
                  <Link to="/tournaments" className="text-dragon-400 hover:text-dragon-300 text-sm transition-colors">
                    Ver todos los torneos →
                  </Link>
                </div>
              )}
            </section>
          )}

          {tournaments.length === 0 && (
            <div className="text-center py-16 text-parchment-400">
              <p className="text-4xl mb-4">🏈</p>
              <p className="text-lg font-display text-parchment-300 mb-2">Sin torneos todavía</p>
              <p className="text-sm mb-6">Crea el primer torneo para empezar</p>
              <Link to="/tournaments/new" className="btn-primary">Crear torneo</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
