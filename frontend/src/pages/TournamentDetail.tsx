import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tournaments as api, players as playersApi, participants as participantsApi, reference } from '../api/client';
import type { Tournament, StandingsEntry, BracketData, Player, Race, Position } from '../types';
import BracketView from '../components/bracket/BracketView';
import TeamSheetForm, { type TeamSheetData } from '../components/TeamSheetForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';
import Th from '../components/ui/Th';
import { Spinner } from '../components/ui/Spinner';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  ACTIVE: 'Activo', COMPLETED: 'Finalizado',
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
  const [completing, setCompleting] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
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

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.complete(tournamentId);
      await load();
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al completar torneo');
    } finally {
      setCompleting(false);
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

  if (loading) return <div className="flex justify-center py-16"><Spinner size="md" className="text-parchment-400/40" /></div>;
  if (error) return <div className="text-center py-12 text-dragon-400">{error}</div>;
  if (!tournament) return <div className="text-center py-12 text-parchment-400">Torneo no encontrado.</div>;

  return (
    <div className="space-y-8">
      {confirmDelete && (
        <ConfirmModal
          title="Eliminar torneo"
          message={`¿Eliminar "${tournament.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmComplete && (
        <ConfirmModal
          title="Completar torneo"
          message={`¿Dar por finalizado "${tournament.name}"? El torneo quedará cerrado y no se podrán registrar más resultados.`}
          confirmLabel="Completar"
          danger={false}
          loading={completing}
          onConfirm={handleComplete}
          onCancel={() => setConfirmComplete(false)}
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
                tournament.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'
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
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {tournament.status === 'ACTIVE' && (
              <button
                onClick={() => setShowRegister(!showRegister)}
                className="btn-secondary"
              >
                {showRegister ? 'Cancelar' : '+ Inscribir'}
              </button>
            )}
            {tournament.status === 'ACTIVE' && (!bracket || bracket.rounds.length === 0) && tournament.format !== 'MIXED' && (tournament.participants?.length ?? 0) >= 2 && (
              <button onClick={handleGenerateBracket} disabled={generatingBracket} className="btn-primary inline-flex items-center gap-1.5">
                {generatingBracket && <Spinner size="sm" />}
                {generatingBracket ? 'Generando…' : 'Generar bracket'}
              </button>
            )}
            <button
              onClick={() => navigate(`/tournaments/${tournamentId}/edit`)}
              className="btn-secondary"
            >
              Editar
            </button>
            {tournament.status === 'ACTIVE' && (
              <button
                onClick={() => setConfirmComplete(true)}
                disabled={completing}
                className="btn-primary"
              >
                Completar torneo
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="btn-danger"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Formulario de inscripción (inline, solo cuando está abierto) */}
      {showRegister && (
        <RegisterForm
          tournamentId={tournamentId}
          onSuccess={() => { setShowRegister(false); load(); }}
        />
      )}

      {/* Asignación de grupos — solo para MIXED sin partidos generados */}
      {tournament.format === 'MIXED' && (!bracket || bracket.rounds.length === 0) && (
        <section>
          <h2 className="section-title">Asignación de grupos</h2>
          <GroupAssignment
            tournament={tournament}
            onUpdated={load}
            onGenerateBracket={handleGenerateBracket}
            generatingBracket={generatingBracket}
          />
        </section>
      )}

      {/* Bracket */}
      {bracket && bracket.rounds.length > 0 && (
        <section>
          <h2 className="section-title">Bracket</h2>
          <BracketView
            bracket={bracket}
            tournament={tournament}
            standings={standings}
            onResultSubmitted={load}
            onRosterSaved={load}
          />
        </section>
      )}

      {/* Clasificación — solo para formatos no MIXED (en MIXED ya está en los grupos del bracket) */}
      {tournament.format !== 'MIXED' && standings.length > 0 && (
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
              <th className="px-2 py-2 font-medium w-6 text-center">#</th>
              <th className="px-3 py-2 font-medium text-left">Jugador</th>
              <th className="px-2 py-2 font-medium text-left hidden sm:table-cell">Equipo</th>
              <th className="px-2 py-2 font-medium text-left hidden md:table-cell">Raza</th>
              <Th tooltip="Partidos Jugados — total de partidos disputados en el torneo" className="px-1 py-2 font-medium w-10 hidden sm:table-cell">PJ</Th>
              <Th tooltip="Victorias — partidos ganados. Vale 3 puntos cada una" className="px-1 py-2 font-medium w-8">V</Th>
              <Th tooltip="Empates — partidos terminados en empate. Vale 1 punto cada uno" className="px-1 py-2 font-medium w-8 hidden xs:table-cell">E</Th>
              <Th tooltip="Derrotas — partidos perdidos. No suman puntos" className="px-1 py-2 font-medium w-8">D</Th>
              <Th tooltip="Puntos totales — calculados como V×3 + E×1 + D×0" className="px-1 py-2 font-medium w-10">Pts</Th>
              <Th tooltip="Touchdowns a Favor — total de touchdowns anotados por el equipo" className="px-1 py-2 font-medium w-10 hidden sm:table-cell">TF</Th>
              <Th tooltip="Touchdowns en Contra — total de touchdowns recibidos por el equipo" className="px-1 py-2 font-medium w-10 hidden sm:table-cell">TC</Th>
              <Th tooltip="Diferencia de Touchdowns — TF menos TC. Desempate en caso de igualdad de puntos" className="px-1 py-2 font-medium w-10">Dif</Th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.participantId} className="table-row">
                <td className="px-2 py-2.5 text-center text-parchment-400/60 text-xs font-mono">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-parchment-100 font-medium text-xs">{s.playerName}</span>
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded leading-none ${s.isVeteran ? 'bg-terracota-500/20 text-terracota-400' : 'bg-verde-500/20 text-verde-400'}`}>
                      {s.isVeteran ? 'V' : 'N'}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-parchment-400 text-xs hidden sm:table-cell">{s.teamName ?? '—'}</td>
                <td className="px-2 py-2.5 text-parchment-400 text-xs hidden md:table-cell">{s.raceName}</td>
                <td className="px-1 py-2.5 text-center text-parchment-300 text-xs hidden sm:table-cell">{s.played}</td>
                <td className="px-1 py-2.5 text-center text-verde-400 font-medium text-xs">{s.wins}</td>
                <td className="px-1 py-2.5 text-center text-parchment-400 text-xs hidden xs:table-cell">{s.draws}</td>
                <td className="px-1 py-2.5 text-center text-dragon-400 text-xs">{s.losses}</td>
                <td className="px-1 py-2.5 text-center text-parchment-100 font-bold text-xs">{s.points}</td>
                <td className="px-1 py-2.5 text-center text-parchment-400 text-xs hidden sm:table-cell">{s.tdFor}</td>
                <td className="px-1 py-2.5 text-center text-parchment-400 text-xs hidden sm:table-cell">{s.tdAgainst}</td>
                <td className={`px-1 py-2.5 text-center font-medium text-xs ${s.tdDiff > 0 ? 'text-verde-400' : s.tdDiff < 0 ? 'text-dragon-400' : 'text-parchment-400'}`}>
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

// ─── GroupAssignment ──────────────────────────────────────────────────────────

function GroupAssignment({
  tournament,
  onUpdated,
  onGenerateBracket,
  generatingBracket,
}: {
  tournament: Tournament;
  onUpdated: () => void;
  onGenerateBracket: () => void;
  generatingBracket: boolean;
}) {
  const groupCount = tournament.groupCount ?? 2;
  const participants = tournament.participants ?? [];
  const [dragId, setDragId] = useState<number | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const allAssigned = participants.length > 0 && participants.every((p) => p.groupNumber != null);

  const groupLetter = (n: number) => String.fromCharCode(64 + n);

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      await api.autoAssignGroups(tournament.id);
      onUpdated();
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al auto-asignar grupos');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleDrop = async (targetGroup: number | null) => {
    if (dragId == null) return;
    try {
      await api.setGroups(tournament.id, [{ participantId: dragId, groupNumber: targetGroup }]);
      onUpdated();
    } catch (e: unknown) {
      setAlertMsg(e instanceof Error ? e.message : 'Error al mover participante');
    }
    setDragId(null);
  };

  const columns: Array<{ key: string; label: string; group: number | null }> = [
    ...Array.from({ length: groupCount }, (_, i) => ({
      key: `group-${i + 1}`,
      label: `Grupo ${groupLetter(i + 1)}`,
      group: i + 1,
    })),
    { key: 'unassigned', label: 'Sin grupo', group: null },
  ];

  return (
    <div className="space-y-4">
      {alertMsg && <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="button"
          onClick={handleAutoAssign}
          disabled={autoAssigning}
          className="btn-secondary text-xs inline-flex items-center gap-1.5"
        >
          {autoAssigning && <Spinner size="sm" />}
          {autoAssigning ? 'Asignando…' : 'Auto-asignar'}
        </button>
        <button
          type="button"
          onClick={onGenerateBracket}
          disabled={!allAssigned || generatingBracket}
          className="btn-primary text-xs disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          {generatingBracket && <Spinner size="sm" />}
          {generatingBracket ? 'Generando…' : 'Generar partidos'}
        </button>
        {!allAssigned && (
          <span className="text-parchment-400 text-xs italic">
            Todos los participantes deben tener grupo asignado.
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
      <div className="grid gap-3 min-w-[480px]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(130px, 1fr))` }}>
        {columns.map(({ key, label, group }) => {
          const colParticipants = participants.filter((p) =>
            group == null ? p.groupNumber == null : p.groupNumber === group
          );
          return (
            <div
              key={key}
              className="card p-3 min-h-[120px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(group)}
            >
              <h4 className="text-xs font-bold text-parchment-400 uppercase tracking-wider mb-2">{label}</h4>
              <div className="space-y-1.5">
                {colParticipants.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    className="flex items-center justify-between gap-2 bg-parchment-100/5 hover:bg-parchment-100/10 rounded px-2 py-1.5 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-parchment-100 text-xs font-medium truncate">{p.player.name}</p>
                      {p.teamName && <p className="text-parchment-400/60 text-xs truncate">{p.teamName}</p>}
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${p.isVeteran ? 'bg-terracota-500/20 text-terracota-400' : 'bg-verde-500/20 text-verde-400'}`}>
                      {p.isVeteran ? 'V' : 'N'}
                    </span>
                  </div>
                ))}
                {colParticipants.length === 0 && (
                  <p className="text-parchment-400/40 text-xs italic text-center py-2">Vacío</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ─── RegisterForm ─────────────────────────────────────────────────────────────

function RegisterForm({ tournamentId, onSuccess }: { tournamentId: number; onSuccess: () => void }) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [playerId, setPlayerId] = useState('');
  const [raceId, setRaceId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isVeteran, setIsVeteran] = useState(false);
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
        isVeteran,
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Nivel</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsVeteran(false)}
                  className={`flex-1 py-2 px-3 rounded text-xs font-semibold transition-colors ${!isVeteran ? 'bg-verde-500 text-white' : 'bg-parchment-100/10 text-parchment-400 hover:text-parchment-100'}`}
                >
                  Novato
                </button>
                <button
                  type="button"
                  onClick={() => setIsVeteran(true)}
                  className={`flex-1 py-2 px-3 rounded text-xs font-semibold transition-colors ${isVeteran ? 'bg-terracota-500 text-white' : 'bg-parchment-100/10 text-parchment-400 hover:text-parchment-100'}`}
                >
                  Veterano
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {raceId && (
              <button type="button" onClick={() => setStep(2)} className="btn-secondary text-xs inline-flex items-center gap-1.5">
                {loadingPositions && <Spinner size="sm" />}
                {loadingPositions ? 'Cargando…' : 'Siguiente: Ficha →'}
              </button>
            )}
            <button type="submit" disabled={submitting || !playerId || !raceId} className="btn-primary text-xs inline-flex items-center gap-1.5">
              {submitting && <Spinner size="sm" />}
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
            <button type="submit" disabled={submitting || !playerId || !raceId} className="btn-primary text-xs inline-flex items-center gap-1.5">
              {submitting && <Spinner size="sm" />}
              {submitting ? 'Inscribiendo…' : 'Inscribir con ficha'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
