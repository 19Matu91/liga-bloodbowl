import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tournaments as api, players as playersApi, participants as participantsApi, reference } from '../api/client';
import type { Tournament, StandingsEntry, BracketData, Player, Race, Position } from '../types';
import BracketView from '../components/bracket/BracketView';
import TeamSheetForm, { type TeamSheetData } from '../components/TeamSheetForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Borrador', ACTIVE: 'Activo', COMPLETED: 'Finalizado',
};
const FORMAT_LABEL: Record<Tournament['format'], string> = {
  MIXED: 'Mixto', SINGLE_ELIMINATION: 'Eliminación directa', ROUND_ROBIN: 'Liguilla',
};

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tournamentId = Number(id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [generatingElim, setGeneratingElim] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, s, b] = await Promise.all([
        api.getById(tournamentId),
        api.getStandings(tournamentId),
        api.getBracket(tournamentId).catch(() => null),
      ]);
      setTournament(t);
      setStandings(s);
      setBracket(b);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar torneo');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(tournamentId);
      navigate('/tournaments');
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al eliminar');
      setDeleting(false);
    }
  };

  const handleGenerateBracket = async () => {
    setGeneratingBracket(true);
    try {
      await api.generateBracket(tournamentId);
      await load();
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al generar bracket');
    } finally {
      setGeneratingBracket(false);
    }
  };

  const handleGenerateElimination = async () => {
    setGeneratingElim(true);
    try {
      await api.generateElimination(tournamentId);
      await load();
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al generar fase eliminatoria');
    } finally {
      setGeneratingElim(false);
    }
  };

  const groupStageComplete = () => {
    if (!bracket) return false;
    const gr = bracket.rounds.filter((r) => r.phase === 'GROUP_STAGE');
    return gr.length > 0 && gr.every((r) => r.matches.every((m) => m.status === 'COMPLETED'));
  };

  const hasElimination = () => bracket?.rounds.some((r) => r.phase === 'ELIMINATION') ?? false;

  if (loading) return <div className="text-center py-12 text-parchment-400">Cargando…</div>;
  if (error) return <div className="text-center py-12 text-dragon-400">{error}</div>;
  if (!tournament) return <div className="text-center py-12 text-parchment-400">Torneo no encontrado.</div>;

  return (
    <div className="space-y-8">
      {confirmDelete && (
        <ConfirmModal
          title="Eliminar torneo"
          message={`¿Eliminar "${tournament.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {alertMsg && <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />}

      <div className="mb-2">
        <Link to="/tournaments" className="text-parchment-400 hover:text-parchment-300 text-sm transition-colors">
          ← Torneos
        </Link>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display text-2xl font-bold text-parchment-100">{tournament.name}</h1>
              <span className={
                tournament.status === 'ACTIVE' ? 'badge-active' :
                tournament.status === 'COMPLETED' ? 'badge-completed' : 'badge-draft'
              }>
                {STATUS_LABEL[tournament.status]}
              </span>
            </div>
            <p className="text-parchment-400 text-sm">
              {tournament.edition} · {tournament.year} · {FORMAT_LABEL[tournament.format]}
            </p>
            {tournament.description && (
              <p className="text-parchment-400/70 text-sm mt-2">{tournament.description}</p>
            )}
            <p className="text-parchment-400/50 text-xs mt-1">
              {new Date(tournament.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {tournament.endDate && ` — ${new Date(tournament.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="btn-danger"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>

      {/* Participants */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">
            Participantes
            <span className="text-parchment-400/60 font-normal text-base ml-2">
              ({tournament.participants?.length ?? 0})
            </span>
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowRegister(!showRegister)}
              className="btn-secondary text-xs"
            >
              {showRegister ? 'Cancelar' : '+ Inscribir'}
            </button>
            {tournament.status === 'DRAFT' && !bracket && (tournament.participants?.length ?? 0) >= 2 && (
              <button
                onClick={handleGenerateBracket}
                disabled={generatingBracket}
                className="btn-primary text-xs"
              >
                {generatingBracket ? 'Generando…' : 'Generar bracket'}
              </button>
            )}
            {tournament.format === 'MIXED' && groupStageComplete() && !hasElimination() && (
              <button
                onClick={handleGenerateElimination}
                disabled={generatingElim}
                className="btn-primary text-xs"
              >
                {generatingElim ? 'Generando…' : 'Fase eliminatoria'}
              </button>
            )}
          </div>
        </div>

        {showRegister && (
          <RegisterForm
            tournamentId={tournamentId}
            onSuccess={() => { setShowRegister(false); load(); }}
          />
        )}

        {(tournament.participants?.length ?? 0) === 0 ? (
          <div className="card p-8 text-center text-parchment-400 italic text-sm">
            Sin participantes inscritos.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 font-medium text-left">Jugador</th>
                    <th className="px-4 py-3 font-medium text-left">Equipo</th>
                    <th className="px-4 py-3 font-medium text-left">Raza</th>
                    <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.participants?.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="px-4 py-3">
                        <Link to={`/players/${p.playerId}`} className="text-parchment-100 hover:text-verde-500 transition-colors font-medium">
                          {p.player.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-parchment-400">{p.teamName ?? '—'}</td>
                      <td className="px-4 py-3 text-parchment-400">{p.race.name}</td>
                      <td className="px-4 py-3 text-right text-parchment-400/60 text-xs hidden sm:table-cell">
                        {p.teamValue > 0 ? `${(p.teamValue / 1000).toFixed(0)}k` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Bracket */}
      {bracket && bracket.rounds.length > 0 && (
        <section>
          <h2 className="section-title">Bracket</h2>
          <BracketView
            bracket={bracket}
            tournament={tournament}
            standings={standings}
            onResultSubmitted={load}
          />
        </section>
      )}

      {/* Standings */}
      {standings.length > 0 && (
        <section>
          <h2 className="section-title">Clasificación</h2>
          <StandingsTable standings={standings} />
        </section>
      )}
    </div>
  );
}

function StandingsTable({ standings }: { standings: StandingsEntry[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 font-medium w-10">#</th>
              <th className="px-4 py-3 font-medium text-left">Jugador</th>
              <th className="px-4 py-3 font-medium text-left hidden sm:table-cell">Equipo</th>
              <th className="px-4 py-3 font-medium text-left hidden md:table-cell">Raza</th>
              <th className="px-4 py-3 font-medium text-center">PJ</th>
              <th className="px-4 py-3 font-medium text-center">V</th>
              <th className="px-4 py-3 font-medium text-center">E</th>
              <th className="px-4 py-3 font-medium text-center">D</th>
              <th className="px-4 py-3 font-medium text-center">Pts</th>
              <th className="px-4 py-3 font-medium text-center hidden lg:table-cell">TF</th>
              <th className="px-4 py-3 font-medium text-center hidden lg:table-cell">TC</th>
              <th className="px-4 py-3 font-medium text-center hidden lg:table-cell">Dif</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.participantId} className="table-row">
                <td className="px-4 py-3 text-center text-parchment-400/60 text-xs font-mono">{i + 1}</td>
                <td className="px-4 py-3 text-parchment-100 font-medium">{s.playerName}</td>
                <td className="px-4 py-3 text-parchment-400 hidden sm:table-cell">{s.teamName ?? '—'}</td>
                <td className="px-4 py-3 text-parchment-400 hidden md:table-cell">{s.raceName}</td>
                <td className="px-4 py-3 text-center text-parchment-300">{s.played}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-medium">{s.wins}</td>
                <td className="px-4 py-3 text-center text-parchment-400">{s.draws}</td>
                <td className="px-4 py-3 text-center text-dragon-400">{s.losses}</td>
                <td className="px-4 py-3 text-center text-parchment-100 font-bold">{s.points}</td>
                <td className="px-4 py-3 text-center text-parchment-400 hidden lg:table-cell">{s.tdFor}</td>
                <td className="px-4 py-3 text-center text-parchment-400 hidden lg:table-cell">{s.tdAgainst}</td>
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

function RegisterForm({ tournamentId, onSuccess }: { tournamentId: number; onSuccess: () => void }) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [playerId, setPlayerId] = useState('');
  const [raceId, setRaceId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sheet, setSheet] = useState<TeamSheetData>({ rerolls: 0, hasApothecary: false, roster: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPositions, setLoadingPositions] = useState(false);

  useEffect(() => {
    Promise.all([playersApi.getAll(), reference.getRaces()])
      .then(([p, r]) => { setAllPlayers(p); setRaces(r); })
      .catch(() => setError('Error al cargar datos'));
  }, []);

  const handleRaceChange = async (newRaceId: string) => {
    setRaceId(newRaceId);
    setPositions([]);
    setSheet({ rerolls: 0, hasApothecary: false, roster: [] });
    if (!newRaceId) return;
    setLoadingPositions(true);
    try {
      const pos = await reference.getRacePositions(Number(newRaceId));
      setPositions(pos);
    } catch {
      setError('Error al cargar posiciones');
    } finally {
      setLoadingPositions(false);
    }
  };

  const selectedRace = races.find((r) => r.id === Number(raceId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !raceId) { setError('Selecciona jugador y raza.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await participantsApi.register(tournamentId, {
        playerId: Number(playerId),
        raceId: Number(raceId),
        teamName: teamName.trim() || undefined,
        rerolls: sheet.rerolls,
        hasApothecary: sheet.hasApothecary,
        roster: sheet.roster.filter((r) => r.positionId !== null).map((r) => ({
          positionId: r.positionId!,
          playerName: r.playerName || undefined,
          skillIds: [],
        })),
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al inscribir');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <h3 className="font-display font-bold text-parchment-100">Inscribir jugador</h3>
      {error && <p className="text-dragon-400 text-xs bg-dragon-500/10 border border-dragon-500/20 rounded p-2">{error}</p>}

      <div className="flex gap-2 text-xs border-b border-parchment-100/10 pb-3">
        <button type="button" onClick={() => setStep(1)}
          className={`px-3 py-1.5 rounded transition-colors ${step === 1 ? 'bg-verde-500 text-white' : 'text-parchment-400 hover:text-parchment-100'}`}>
          1. Datos básicos
        </button>
        <button type="button" onClick={() => { if (raceId) setStep(2); }} disabled={!raceId}
          className={`px-3 py-1.5 rounded transition-colors disabled:opacity-40 ${step === 2 ? 'bg-verde-500 text-white' : 'text-parchment-400 hover:text-parchment-100'}`}>
          2. Ficha de equipo
        </button>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Jugador *</label>
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className="select-field" required>
                <option value="">Seleccionar…</option>
                {allPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Raza *</label>
              <select value={raceId} onChange={(e) => handleRaceChange(e.target.value)} className="select-field" required>
                <option value="">Seleccionar…</option>
                {races.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Nombre de equipo</label>
              <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="input-field" placeholder="Opcional" />
            </div>
          </div>
          <div className="flex gap-2">
            {raceId && (
              <button type="button" onClick={() => setStep(2)} className="btn-secondary text-xs">
                {loadingPositions ? 'Cargando…' : 'Siguiente: Ficha →'}
              </button>
            )}
            <button type="submit" disabled={submitting || !playerId || !raceId} className="btn-primary text-xs">
              {submitting ? 'Inscribiendo…' : 'Inscribir sin ficha'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && selectedRace && (
        <div className="space-y-4">
          <TeamSheetForm
            teamName={teamName}
            raceName={selectedRace.name}
            rerollCost={selectedRace.rerollCost}
            positions={positions}
            value={sheet}
            onChange={setSheet}
          />
          <div className="flex gap-2 pt-3 border-t border-parchment-100/10">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary text-xs">← Atrás</button>
            <button type="submit" disabled={submitting || !playerId || !raceId} className="btn-primary text-xs">
              {submitting ? 'Inscribiendo…' : 'Inscribir con ficha'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
