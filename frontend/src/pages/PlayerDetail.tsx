import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { players as api } from '../api/client';
import type { Player, Participant, Match } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';
import Th from '../components/ui/Th';
import { Spinner } from '../components/ui/Spinner';

type PlayerWithHistory = Player & {
  participants: (Participant & {
    tournament: { id: number; name: string; year: number; edition: string };
    homeMatches: Match[];
    awayMatches: Match[];
  })[];
};

function calcStats(p: PlayerWithHistory['participants'][0]) {
  let played = 0, wins = 0, draws = 0, losses = 0, tdFor = 0, tdAgainst = 0;
  for (const m of p.homeMatches) {
    if (m.status !== 'COMPLETED' || m.homeTDs == null || m.awayTDs == null) continue;
    played++; tdFor += m.homeTDs; tdAgainst += m.awayTDs;
    if (m.homeTDs > m.awayTDs) wins++; else if (m.homeTDs < m.awayTDs) losses++; else draws++;
  }
  for (const m of p.awayMatches) {
    if (m.status !== 'COMPLETED' || m.homeTDs == null || m.awayTDs == null) continue;
    played++; tdFor += m.awayTDs; tdAgainst += m.homeTDs;
    if (m.awayTDs > m.homeTDs) wins++; else if (m.awayTDs < m.homeTDs) losses++; else draws++;
  }
  return { played, wins, draws, losses, points: wins * 3 + draws, tdFor, tdAgainst, tdDiff: tdFor - tdAgainst };
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<PlayerWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getById(Number(id))
      .then((p) => { setPlayer(p as unknown as PlayerWithHistory); setName(p.name); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await api.update(Number(id), { name: name.trim() });
      setPlayer((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(Number(id));
      navigate('/players');
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al eliminar');
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="md" className="text-parchment-400/40" /></div>;
  if (error) return <div className="text-center py-12 text-dragon-400">{error}</div>;
  if (!player) return <div className="text-center py-12 text-parchment-400">Jugador no encontrado.</div>;

  return (
    <div className="space-y-8">
      {confirmDelete && (
        <ConfirmModal
          title="Eliminar jugador"
          message={`¿Eliminar a "${player.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {alertMsg && <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />}

      <div className="mb-2">
        <Link to="/players" className="text-parchment-400 hover:text-parchment-300 text-sm transition-colors">
          ← Jugadores
        </Link>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-verde-500/10 border border-verde-500/20 flex items-center justify-center text-verde-500 font-display font-bold text-xl shrink-0">
              {player.name.charAt(0).toUpperCase()}
            </div>
            {editing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field text-lg font-display font-bold"
                autoFocus
              />
            ) : (
              <div>
                <h1 className="font-display text-2xl font-bold text-parchment-100">{player.name}</h1>
                <p className="text-parchment-400 text-sm mt-0.5">
                  {player.participants.length} torneo{player.participants.length !== 1 ? 's' : ''} jugado{player.participants.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary inline-flex items-center gap-1.5">
                  {saving && <Spinner size="sm" />}
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button onClick={() => { setEditing(false); setName(player.name); }} className="btn-secondary">
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary">Editar</button>
                <button onClick={() => setConfirmDelete(true)} disabled={deleting} className="btn-danger">
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tournament history */}
      <section>
        <h2 className="section-title">Historial de torneos</h2>
        {player.participants.length === 0 ? (
          <div className="card p-8 text-center text-parchment-400 italic text-sm">
            Sin participaciones registradas.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 font-medium text-left">Torneo</th>
                    <th className="px-4 py-3 font-medium text-left hidden sm:table-cell">Raza</th>
                    <th className="px-4 py-3 font-medium text-left hidden md:table-cell">Equipo</th>
                    <Th tooltip="Partidos Jugados — total de partidos disputados en este torneo" className="px-4 py-3 font-medium">PJ</Th>
                    <Th tooltip="Victorias — partidos ganados. Vale 3 puntos cada una" className="px-4 py-3 font-medium">V</Th>
                    <Th tooltip="Empates — partidos terminados en empate. Vale 1 punto cada uno" className="px-4 py-3 font-medium">E</Th>
                    <Th tooltip="Derrotas — partidos perdidos. No suman puntos" className="px-4 py-3 font-medium">D</Th>
                    <Th tooltip="Puntos totales — calculados como V×3 + E×1 + D×0" className="px-4 py-3 font-medium">Pts</Th>
                    <Th tooltip="Diferencia de Touchdowns — TF menos TC. Desempate en caso de igualdad de puntos" className="px-4 py-3 font-medium hidden lg:table-cell">Dif</Th>
                  </tr>
                </thead>
                <tbody>
                  {player.participants.map((p) => {
                    const s = calcStats(p);
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="px-4 py-3">
                          <Link to={`/tournaments/${p.tournament.id}`} className="text-parchment-100 hover:text-verde-500 transition-colors font-medium">
                            {p.tournament.name}
                          </Link>
                          <span className="text-parchment-400/60 text-xs ml-1">{p.tournament.year}</span>
                        </td>
                        <td className="px-4 py-3 text-parchment-400 hidden sm:table-cell">{p.race.name}</td>
                        <td className="px-4 py-3 text-parchment-400 hidden md:table-cell">{p.teamName ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-parchment-300">{s.played}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-medium">{s.wins}</td>
                        <td className="px-4 py-3 text-center text-parchment-400">{s.draws}</td>
                        <td className="px-4 py-3 text-center text-dragon-400">{s.losses}</td>
                        <td className="px-4 py-3 text-center text-parchment-100 font-bold">{s.points}</td>
                        <td className={`px-4 py-3 text-center font-medium hidden lg:table-cell ${s.tdDiff > 0 ? 'text-emerald-600' : s.tdDiff < 0 ? 'text-dragon-400' : 'text-parchment-400'}`}>
                          {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
