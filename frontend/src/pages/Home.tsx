import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { Tournament } from '../types';
import { DragonIcon } from '../components/DragonLogo';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  ACTIVE: 'En curso',
  COMPLETED: 'Finalizado',
};

const FORMAT_LABEL: Record<Tournament['format'], string> = {
  MIXED: 'Grupos + Eliminatoria',
  SINGLE_ELIMINATION: 'Eliminación directa',
  ROUND_ROBIN: 'Liguilla',
};

function TournamentCard({ t }: { t: Tournament }) {
  const isActive = t.status === 'ACTIVE';
  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="card p-5 hover:border-verde-500/40 hover:shadow-md transition-all duration-200 group block"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display font-bold text-parchment-100 group-hover:text-verde-500 transition-colors leading-snug">
          {t.name}
        </h3>
        <span className={isActive ? 'badge-active' : 'badge-completed'}>
          {STATUS_LABEL[t.status]}
        </span>
      </div>
      <p className="text-parchment-400 text-sm">
        {t.edition} · {t.year}
      </p>
      <div className="flex items-center justify-between mt-3">
        <p className="text-parchment-400/50 text-xs">
          {new Date(t.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {(t._count?.participants ?? 0) > 0 && (
          <p className="text-parchment-400/50 text-xs">
            {t._count?.participants} jugador{(t._count?.participants ?? 0) !== 1 ? 'es' : ''}
          </p>
        )}
      </div>
      <p className="text-parchment-400/30 text-xs mt-1">{FORMAT_LABEL[t.format]}</p>
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
  const past = tournaments.filter((t) => t.status === 'COMPLETED').slice(0, 3);

  return (
    <div>
      {/* Hero — full-bleed terracota, igual que EDM */}
      <div className="bg-terracota-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Icono dragón */}
            <div className="flex-shrink-0">
              <DragonIcon className="h-24 w-24 sm:h-28 sm:w-28 text-white/90" />
            </div>
            {/* Texto */}
            <div>
              <p className="text-white/60 text-xs tracking-[0.2em] uppercase font-sans mb-1">
                Blood Bowl · Granada
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-2">
                El Dragón de Madera
              </h1>
              <p className="text-white/70 text-base font-sans mb-6">
                Liga privada de Blood Bowl del club El Dragón de Madera
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/tournaments/new" className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-terracota-500 font-semibold text-sm hover:bg-white/90 transition-colors">
                  + Nuevo torneo
                </Link>
                <Link to="/players/new" className="inline-flex items-center px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-colors">
                  + Nuevo jugador
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {loading ? (
          <div className="text-center py-12 text-parchment-400/50 text-sm">Cargando…</div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <h2 className="section-title flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Torneos en curso
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {active.map((t) => <TournamentCard key={t.id} t={t} />)}
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
                    <Link to="/tournaments" className="text-verde-500 hover:text-verde-400 text-sm font-semibold transition-colors">
                      Ver todos los torneos →
                    </Link>
                  </div>
                )}
              </section>
            )}

            {tournaments.length === 0 && (
              <div className="text-center py-16 text-parchment-400">
                <DragonIcon className="h-12 w-12 text-parchment-400/20 mx-auto mb-4" />
                <p className="text-lg font-display text-parchment-300 mb-2">Sin torneos todavía</p>
                <p className="text-sm mb-6 text-parchment-400/60">Crea el primer torneo para empezar</p>
                <Link to="/tournaments/new" className="btn-primary">Crear torneo</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
