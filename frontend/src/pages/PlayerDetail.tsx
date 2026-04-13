import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { players as api } from '../api/client';
import type { Player, Participant, Match } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';

type PlayerWithHistory = Player & {
  participants: (Participant & {
    tournament: { id: number; name: string; year: number; edition: string };
    homeMatches: Match[];
    awayMatches: Match[];
  })[];
};

function calcStats(participant: PlayerWithHistory['participants'][0]) {
  let played = 0, wins = 0, draws = 0, losses = 0, tdFor = 0, tdAgainst = 0;
  for (const m of participant.homeMatches) {
    if (m.status !== 'COMPLETED' || m.homeTDs == null || m.awayTDs == null) continue;
    played++; tdFor += m.homeTDs; tdAgainst += m.awayTDs;
    if (m.homeTDs > m.awayTDs) wins++; else if (m.homeTDs < m.awayTDs) losses++; else draws++;
  }
  for (const m of participant.awayMatches) {
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
  const [form, setForm] = useState({ name: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getById(Number(id))
      .then((p) => {
        setPlayer(p as unknown as PlayerWithHistory);
        setForm({ name: p.name });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await api.update(Number(id), { name: form.name.trim() });
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

  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1.5 text-sm outline-none focus:border-red-700';

  if (loading) return <p className="text-gray-400">Cargando…</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!player) return <p className="text-gray-400">Jugador no encontrado.</p>;

  return (
    <div className="space-y-8">
      {confirmDelete && (
        <ConfirmModal
          title="Eliminar jugador"
          message={`¿Eliminar a "${player.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {alertMsg && (
        <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />
      )}
      {/* Profile */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {!editing && (
              <>
                <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                  className="bg-red-900/50 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Eliminando…' : 'Eliminar'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-sm transition-colors"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({ name: player.name });
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ name: e.target.value })} className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Torneos: </span><span className="text-gray-300">{player.participants.length}</span></div>
          </div>
        )}
      </div>

      {/* Tournament history */}
      <section>
        <h2 className="text-lg font-bold text-yellow-500 mb-3">Historial de torneos</h2>
        {player.participants.length === 0 ? (
          <p className="text-gray-500 italic text-sm">Sin participaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Torneo</th>
                  <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Raza</th>
                  <th className="pb-2 pr-4 font-medium hidden md:table-cell">Equipo</th>
                  <th className="pb-2 pr-2 font-medium text-center">PJ</th>
                  <th className="pb-2 pr-2 font-medium text-center">V</th>
                  <th className="pb-2 pr-2 font-medium text-center">E</th>
                  <th className="pb-2 pr-2 font-medium text-center">D</th>
                  <th className="pb-2 pr-2 font-medium text-center">Pts</th>
                  <th className="pb-2 font-medium text-center hidden lg:table-cell">Dif</th>
                </tr>
              </thead>
              <tbody>
                {player.participants.map((p) => {
                  const s = calcStats(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4">
                        <Link to={`/tournaments/${p.tournament.id}`} className="text-white hover:text-red-400 transition-colors font-medium">
                          {p.tournament.name}
                        </Link>
                        <span className="text-gray-500 text-xs ml-1">{p.tournament.year}</span>
                      </td>
                      <td className="py-2 pr-4 text-gray-400 hidden sm:table-cell">{p.race.name}</td>
                      <td className="py-2 pr-4 text-gray-400 hidden md:table-cell">{p.teamName ?? '—'}</td>
                      <td className="py-2 pr-2 text-center text-gray-300">{s.played}</td>
                      <td className="py-2 pr-2 text-center text-green-400">{s.wins}</td>
                      <td className="py-2 pr-2 text-center text-yellow-400">{s.draws}</td>
                      <td className="py-2 pr-2 text-center text-red-400">{s.losses}</td>
                      <td className="py-2 pr-2 text-center text-white font-bold">{s.points}</td>
                      <td className={`py-2 text-center font-medium hidden lg:table-cell ${s.tdDiff > 0 ? 'text-green-400' : s.tdDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
