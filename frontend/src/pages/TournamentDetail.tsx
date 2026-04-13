import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tournaments as api, players as playersApi, participants as participantsApi, reference } from '../api/client';
import type { Tournament, StandingsEntry, BracketData, Player, Race, Position } from '../types';
import BracketView from '../components/bracket/BracketView';
import TeamSheetForm, { type TeamSheetData } from '../components/TeamSheetForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
};
const FORMAT_LABEL: Record<Tournament['format'], string> = {
  MIXED: 'Mixto',
  SINGLE_ELIMINATION: 'Eliminación directa',
  ROUND_ROBIN: 'Liguilla',
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
    const groupRounds = bracket.rounds.filter((r) => r.phase === 'GROUP_STAGE');
    if (groupRounds.length === 0) return false;
    return groupRounds.every((r) => r.matches.every((m) => m.status === 'COMPLETED'));
  };

  const hasElimination = () => bracket?.rounds.some((r) => r.phase === 'ELIMINATION') ?? false;

  if (loading) return <p className="text-gray-400">Cargando…</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!tournament) return <p className="text-gray-400">Torneo no encontrado.</p>;

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
      {alertMsg && (
        <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              tournament.status === 'ACTIVE' ? 'bg-green-900 text-green-300' :
              tournament.status === 'COMPLETED' ? 'bg-gray-600 text-gray-400' :
              'bg-gray-700 text-gray-300'
            }`}>
              {STATUS_LABEL[tournament.status]}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {tournament.edition} · {tournament.year} · {FORMAT_LABEL[tournament.format]}
          </p>
          {tournament.description && (
            <p className="text-gray-500 text-sm mt-2">{tournament.description}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Inicio: {new Date(tournament.startDate).toLocaleDateString('es-ES')}
            {tournament.endDate && ` · Fin: ${new Date(tournament.endDate).toLocaleDateString('es-ES')}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to={`/tournaments/${tournamentId}/edit`}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors"
          >
            Editar
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="bg-red-900/50 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>

      {/* Participants */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-yellow-500">
            Participantes ({tournament.participants?.length ?? 0})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRegister(!showRegister)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors"
            >
              {showRegister ? 'Cancelar' : '+ Inscribir jugador'}
            </button>
            {tournament.status === 'DRAFT' && !bracket && (tournament.participants?.length ?? 0) >= 2 && (
              <button
                onClick={handleGenerateBracket}
                disabled={generatingBracket}
                className="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
              >
                {generatingBracket ? 'Generando…' : 'Generar bracket'}
              </button>
            )}
            {tournament.format === 'MIXED' && groupStageComplete() && !hasElimination() && (
              <button
                onClick={handleGenerateElimination}
                disabled={generatingElim}
                className="bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
              >
                {generatingElim ? 'Generando…' : 'Generar fase eliminatoria'}
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
          <p className="text-gray-500 italic text-sm">No hay participantes inscritos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Jugador</th>
                  <th className="pb-2 pr-4 font-medium">Equipo</th>
                  <th className="pb-2 font-medium">Raza</th>
                </tr>
              </thead>
              <tbody>
                {tournament.participants?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/50">
                    <td className="py-2 pr-4">
                      <Link to={`/players/${p.playerId}`} className="text-white hover:text-red-400 transition-colors">
                        {p.player.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">{p.teamName ?? '—'}</td>
                    <td className="py-2 text-gray-400">{p.race.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bracket */}
      {bracket && bracket.rounds.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-yellow-500 mb-4">Bracket</h2>
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
          <h2 className="text-lg font-bold text-yellow-500 mb-3">Clasificación</h2>
          <StandingsTable standings={standings} />
        </section>
      )}
    </div>
  );
}

function StandingsTable({ standings }: { standings: StandingsEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="pb-2 pr-3 font-medium">Pos</th>
            <th className="pb-2 pr-3 font-medium">Jugador</th>
            <th className="pb-2 pr-3 font-medium hidden sm:table-cell">Equipo</th>
            <th className="pb-2 pr-3 font-medium hidden md:table-cell">Raza</th>
            <th className="pb-2 pr-3 font-medium text-center">PJ</th>
            <th className="pb-2 pr-3 font-medium text-center">V</th>
            <th className="pb-2 pr-3 font-medium text-center">E</th>
            <th className="pb-2 pr-3 font-medium text-center">D</th>
            <th className="pb-2 pr-3 font-medium text-center">Pts</th>
            <th className="pb-2 pr-3 font-medium text-center hidden lg:table-cell">TF</th>
            <th className="pb-2 pr-3 font-medium text-center hidden lg:table-cell">TC</th>
            <th className="pb-2 font-medium text-center hidden lg:table-cell">Dif</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.participantId} className="border-b border-gray-800/50">
              <td className="py-2 pr-3 text-gray-500">{i + 1}</td>
              <td className="py-2 pr-3 text-white font-medium">{s.playerName}</td>
              <td className="py-2 pr-3 text-gray-400 hidden sm:table-cell">{s.teamName ?? '—'}</td>
              <td className="py-2 pr-3 text-gray-400 hidden md:table-cell">{s.raceName}</td>
              <td className="py-2 pr-3 text-center text-gray-300">{s.played}</td>
              <td className="py-2 pr-3 text-center text-green-400">{s.wins}</td>
              <td className="py-2 pr-3 text-center text-yellow-400">{s.draws}</td>
              <td className="py-2 pr-3 text-center text-red-400">{s.losses}</td>
              <td className="py-2 pr-3 text-center text-white font-bold">{s.points}</td>
              <td className="py-2 pr-3 text-center text-gray-400 hidden lg:table-cell">{s.tdFor}</td>
              <td className="py-2 pr-3 text-center text-gray-400 hidden lg:table-cell">{s.tdAgainst}</td>
              <td className={`py-2 text-center font-medium hidden lg:table-cell ${s.tdDiff > 0 ? 'text-green-400' : s.tdDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {s.tdDiff > 0 ? `+${s.tdDiff}` : s.tdDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegisterForm({
  tournamentId,
  onSuccess,
}: {
  tournamentId: number;
  onSuccess: () => void;
}) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [playerId, setPlayerId] = useState('');
  const [raceId, setRaceId] = useState('');
  const [teamName, setTeamName] = useState('');

  // Step 2 — team sheet
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
      setError('Error al cargar posiciones de la raza');
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
        roster: sheet.roster
          .filter((r) => r.positionId !== null)
          .map((r) => ({
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

  const selectCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1.5 text-sm outline-none focus:border-red-700';
  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1.5 text-sm outline-none focus:border-red-700';

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded p-4 mb-4 space-y-4">
      <h3 className="text-sm font-bold text-white">Inscribir jugador</h3>
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Step indicator */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`px-3 py-1 rounded transition-colors ${step === 1 ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          1. Datos básicos
        </button>
        <button
          type="button"
          onClick={() => { if (raceId) setStep(2); }}
          disabled={!raceId}
          className={`px-3 py-1 rounded transition-colors disabled:opacity-40 ${step === 2 ? 'bg-red-800 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          2. Ficha de equipo
        </button>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Jugador *</label>
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={selectCls} required>
                <option value="">Seleccionar…</option>
                {allPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Raza *</label>
              <select value={raceId} onChange={(e) => handleRaceChange(e.target.value)} className={selectCls} required>
                <option value="">Seleccionar…</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Nombre de equipo</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className={inputCls}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {raceId && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm transition-colors"
              >
                {loadingPositions ? 'Cargando…' : 'Siguiente: Ficha →'}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !playerId || !raceId}
              className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm transition-colors"
            >
              {submitting ? 'Inscribiendo…' : 'Inscribir sin ficha'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
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
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm transition-colors"
            >
              ← Atrás
            </button>
            <button
              type="submit"
              disabled={submitting || !playerId || !raceId}
              className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm transition-colors"
            >
              {submitting ? 'Inscribiendo…' : 'Inscribir con ficha'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
