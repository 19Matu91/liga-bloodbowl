import { useEffect, useState } from 'react';
import { participants as participantsApi, reference } from '../api/client';
import type { Skill, Position } from '../types';
import Th from './ui/Th';

// ─── Types from API response ──────────────────────────────────────────────────

interface RosterEntryFull {
  id: number;
  positionId: number;
  playerName: string | null;
  spp: number;
  injuries: string | null;
  position: {
    id: number;
    name: string;
    ma: number; st: number; ag: number; pa: number | null; av: number;
    cost: number;
    skills: Array<{ skill: { id: number; name: string } }>;
  };
  skills: Array<{ skill: { id: number; name: string } }>;
}

interface ParticipantFull {
  id: number;
  teamName: string | null;
  rerolls: number;
  hasApothecary: boolean;
  teamValue: number;
  isVeteran: boolean;
  player: { id: number; name: string };
  race: { id: number; name: string; rerollCost: number; imageUrl: string | null };
  roster: RosterEntryFull[];
}

// ─── Edit row state ────────────────────────────────────────────────────────────

interface EditRow {
  positionId: number | null;
  playerName: string;
  spp: number;
  injuries: string;
  additionalSkillIds: number[];
  // display helpers
  positionName: string;
  ma: number; st: number; ag: number; pa: number | null; av: number;
  baseSkills: string[];
  cost: number;
}

const INJURY_OPTIONS = ['', 'MNG', '-MA', '-ST', '-AG', '-AV', 'Niggling', 'Muerto'];

function formatTV(n: number) {
  return (n / 1000).toFixed(0) + 'k MO';
}

function statDisplay(val: number | null) {
  return val === null ? '—' : String(val);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  participantId: number;
  canEdit: boolean;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RosterModal({ participantId, canEdit, onClose }: Props) {
  const [participant, setParticipant] = useState<ParticipantFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [editRerolls, setEditRerolls] = useState(0);
  const [editApothecary, setEditApothecary] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reference data for edit mode
  const [positions, setPositions] = useState<Position[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loadingRef, setLoadingRef] = useState(false);

  useEffect(() => {
    participantsApi.getById(participantId)
      .then((p) => setParticipant(p as unknown as ParticipantFull))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar ficha'))
      .finally(() => setLoading(false));
  }, [participantId]);

  const enterEdit = async () => {
    if (!participant) return;
    setLoadingRef(true);
    try {
      const [pos, skills] = await Promise.all([
        reference.getRacePositions(participant.race.id),
        reference.getSkills(),
      ]);
      setPositions(pos);
      setAllSkills(skills);
      setEditRerolls(participant.rerolls);
      setEditApothecary(participant.hasApothecary);
      setEditRows(participant.roster.map((e) => ({
        positionId: e.positionId,
        playerName: e.playerName ?? '',
        spp: e.spp,
        injuries: e.injuries ?? '',
        additionalSkillIds: e.skills.map((s) => s.skill.id),
        positionName: e.position.name,
        ma: e.position.ma, st: e.position.st, ag: e.position.ag,
        pa: e.position.pa, av: e.position.av,
        baseSkills: e.position.skills.map((ps) => ps.skill.name),
        cost: e.position.cost,
      })));
      setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos de edición');
    } finally {
      setLoadingRef(false);
    }
  };

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    try {
      const roster = editRows
        .filter((r) => r.positionId !== null)
        .map((r) => ({
          positionId: r.positionId!,
          playerName: r.playerName.trim() || undefined,
          spp: r.spp,
          injuries: r.injuries.trim() || undefined,
          skillIds: r.additionalSkillIds,
        }));
      await participantsApi.updateRoster(participantId, roster, editRerolls, editApothecary);
      // Reload
      const updated = await participantsApi.getById(participantId);
      setParticipant(updated as unknown as ParticipantFull);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar ficha');
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    setEditRows((prev) => [...prev, {
      positionId: null, playerName: '', spp: 0, injuries: '',
      additionalSkillIds: [], positionName: '', ma: 0, st: 0, ag: 0, pa: null, av: 0, baseSkills: [], cost: 0,
    }]);
  };

  const removeRow = (i: number) => setEditRows((prev) => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<EditRow>) =>
    setEditRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const handlePositionChange = (i: number, posId: string) => {
    const pos = positions.find((p) => p.id === Number(posId));
    if (!pos) { updateRow(i, { positionId: null, positionName: '', ma: 0, st: 0, ag: 0, pa: null, av: 0, baseSkills: [], cost: 0 }); return; }
    updateRow(i, {
      positionId: pos.id,
      positionName: pos.name,
      ma: pos.ma, st: pos.st, ag: pos.ag, pa: pos.pa, av: pos.av,
      baseSkills: pos.skills.map((ps) => ps.skill.name),
      cost: pos.cost,
    });
  };

  const toggleSkill = (rowIdx: number, skillId: number) => {
    const row = editRows[rowIdx];
    const ids = row.additionalSkillIds.includes(skillId)
      ? row.additionalSkillIds.filter((id) => id !== skillId)
      : [...row.additionalSkillIds, skillId];
    updateRow(rowIdx, { additionalSkillIds: ids });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 pt-4 sm:p-4 sm:pt-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative card w-full max-w-4xl shadow-2xl mb-8">
        {/* Modal header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-parchment-100/10">
          <div>
            {loading ? (
              <div className="h-6 w-48 bg-parchment-100/10 rounded animate-pulse" />
            ) : participant ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-lg font-bold text-parchment-100">
                    {participant.teamName ?? participant.player.name}
                  </h2>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${participant.isVeteran ? 'bg-terracota-500/20 text-terracota-400' : 'bg-verde-500/20 text-verde-400'}`}>
                    {participant.isVeteran ? 'Veterano' : 'Novato'}
                  </span>
                </div>
                <p className="text-parchment-400 text-sm mt-0.5">
                  {participant.player.name} · {participant.race.name}
                </p>
              </>
            ) : null}
          </div>
          <button onClick={onClose} className="text-parchment-400 hover:text-parchment-100 text-xl leading-none shrink-0 mt-0.5">×</button>
        </div>

        <div className="p-5">
          {loading && <p className="text-parchment-400 text-sm">Cargando ficha…</p>}
          {error && <p className="text-dragon-400 text-sm">{error}</p>}

          {participant && !loading && (
            <>
              {/* Stats bar */}
              <div className="flex flex-wrap gap-4 mb-5 text-sm">
                <Stat label="Valor de equipo" value={formatTV(editing
                  ? editRows.filter(r => r.cost).reduce((s, r) => s + r.cost, 0)
                    + editRerolls * participant.race.rerollCost
                    + (editApothecary ? 50000 : 0)
                  : participant.teamValue)} highlight />
                {editing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-parchment-400 text-xs">Re-rolls:</span>
                      <input type="number" min={0} max={8} value={editRerolls}
                        onChange={(e) => setEditRerolls(Math.max(0, Math.min(8, Number(e.target.value))))}
                        className="w-14 bg-white/5 border border-parchment-100/20 text-parchment-100 text-center rounded px-1 py-0.5 text-sm outline-none focus:border-verde-500" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editApothecary}
                        onChange={(e) => setEditApothecary(e.target.checked)}
                        className="w-3.5 h-3.5 accent-verde-500" />
                      <span className="text-parchment-300 text-xs">Apotecario</span>
                    </label>
                  </>
                ) : (
                  <>
                    <Stat label="Re-rolls" value={String(participant.rerolls)} />
                    <Stat label="Apotecario" value={participant.hasApothecary ? 'Sí' : 'No'} />
                    <Stat label="Jugadores" value={String(participant.roster.length)} />
                  </>
                )}
              </div>

              {/* Roster — view mode */}
              {!editing && (
                <>
                  {participant.roster.length === 0 ? (
                    <p className="text-parchment-400/60 italic text-sm">Sin ficha registrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-parchment-100/10 text-parchment-400">
                            <th className="pb-2 pr-3 text-left w-8">#</th>
                            <th className="pb-2 pr-3 text-left">Nombre</th>
                            <th className="pb-2 pr-3 text-left">Posición</th>
                            <Th tooltip="Movimiento — número de casillas que puede moverse el jugador por turno" className="pb-2 pr-2 w-8">MA</Th>
                            <Th tooltip="Fuerza — valor de fuerza para bloqueos y resistencia (mayor es mejor)" className="pb-2 pr-2 w-8">ST</Th>
                            <Th tooltip="Agilidad — dificultad para coger, pasar y esquivar (menor es mejor)" className="pb-2 pr-2 w-8">AG</Th>
                            <Th tooltip="Pase — dificultad para pasar el balón (menor es mejor). '—' indica que el jugador no puede pasar" className="pb-2 pr-2 w-8">PA</Th>
                            <Th tooltip="Armadura — dificultad para derribar al jugador tras un bloqueo (mayor es mejor)" className="pb-2 pr-2 w-8">AV</Th>
                            <th className="pb-2 pr-3 text-left">Habilidades</th>
                            <Th tooltip="Star Player Points — puntos de experiencia. Con 6 se consigue una mejora menor; con 16 una habilidad doble o mejora de característica" className="pb-2 pr-3 w-10">SPP</Th>
                            <Th tooltip="Lesiones permanentes: MNG (Missing Next Game), -MA/-ST/-AG/-AV (reducción de característica), Niggling (tirada por partido), Muerto" align="left" className="pb-2">Lesiones</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {participant.roster.map((e, i) => {
                            const allSkills = [
                              ...e.position.skills.map((ps) => ps.skill.name),
                              ...e.skills.map((s) => s.skill.name),
                            ];
                            const isDead = e.injuries?.toLowerCase().includes('muerto');
                            return (
                              <tr key={e.id} className={`border-b border-parchment-100/5 ${isDead ? 'opacity-40' : ''}`}>
                                <td className="py-2 pr-3 text-parchment-400/50 font-mono">{i + 1}</td>
                                <td className="py-2 pr-3 font-medium text-parchment-100">{e.playerName ?? <span className="text-parchment-400/40 italic">—</span>}</td>
                                <td className="py-2 pr-3 text-parchment-300">{e.position.name}</td>
                                <td className="py-2 pr-2 text-center text-parchment-200">{e.position.ma}</td>
                                <td className="py-2 pr-2 text-center text-parchment-200">{e.position.st}</td>
                                <td className="py-2 pr-2 text-center text-parchment-200">{e.position.ag}</td>
                                <td className="py-2 pr-2 text-center text-parchment-200">{statDisplay(e.position.pa)}</td>
                                <td className="py-2 pr-2 text-center text-parchment-200">{e.position.av}</td>
                                <td className="py-2 pr-3">
                                  <div className="flex flex-wrap gap-1">
                                    {allSkills.length === 0
                                      ? <span className="text-parchment-400/30">—</span>
                                      : allSkills.map((s) => (
                                        <span key={s} className="bg-parchment-100/8 text-parchment-300 px-1.5 py-0.5 rounded text-[10px]">{s}</span>
                                      ))
                                    }
                                  </div>
                                </td>
                                <td className="py-2 pr-3 text-center">
                                  <span className={`font-mono font-bold ${e.spp > 0 ? 'text-verde-400' : 'text-parchment-400/40'}`}>{e.spp}</span>
                                </td>
                                <td className="py-2">
                                  {e.injuries
                                    ? <span className="bg-dragon-400/15 text-dragon-400 px-1.5 py-0.5 rounded text-[10px] font-medium">{e.injuries}</span>
                                    : <span className="text-parchment-400/30">—</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {canEdit && (
                    <div className="mt-4 pt-4 border-t border-parchment-100/10">
                      <button onClick={enterEdit} disabled={loadingRef} className="btn-secondary text-xs">
                        {loadingRef ? 'Cargando…' : '✎ Editar ficha'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Roster — edit mode */}
              {editing && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-parchment-100/10 text-parchment-400">
                          <th className="pb-2 pr-2 text-left w-6">#</th>
                          <th className="pb-2 pr-2 text-left min-w-[100px]">Nombre</th>
                          <th className="pb-2 pr-2 text-left min-w-[140px]">Posición</th>
                          <Th tooltip="Star Player Points — puntos de experiencia acumulados. 6=mejora menor, 16=habilidad doble o mejora de característica" className="pb-2 pr-2 w-12">SPP</Th>
                          <Th tooltip="Lesión permanente: MNG (falta próximo partido), -MA/-ST/-AG/-AV (reducción de característica), Niggling (tirada por cada partido), Muerto" align="left" className="pb-2 pr-2 min-w-[100px]">Lesión</Th>
                          <Th tooltip="Habilidades adquiridas durante el torneo — mejoras adicionales sobre las habilidades base de la posición" align="left" className="pb-2 min-w-[160px]">Habilidades extra</Th>
                          <th className="pb-2 w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editRows.map((row, i) => (
                          <EditRowComponent
                            key={i}
                            row={row}
                            idx={i}
                            positions={positions}
                            allSkills={allSkills}
                            onPositionChange={handlePositionChange}
                            onUpdate={updateRow}
                            onRemove={removeRow}
                            onToggleSkill={toggleSkill}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {editRows.length < 16 && (
                    <button type="button" onClick={addRow}
                      className="text-xs text-verde-500 hover:text-verde-400 border border-verde-500/30 hover:border-verde-500/60 rounded px-3 py-1.5 transition-colors">
                      + Fichar jugador
                    </button>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-parchment-100/10">
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-xs">
                      Cancelar
                    </button>
                  </div>
                  {error && <p className="text-dragon-400 text-xs">{error}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-xs">
      <span className="text-parchment-400/60">{label}: </span>
      <span className={highlight ? 'text-terracota-400 font-bold' : 'text-parchment-200 font-medium'}>{value}</span>
    </div>
  );
}

// ─── Edit row ─────────────────────────────────────────────────────────────────

function EditRowComponent({
  row, idx, positions, allSkills, onPositionChange, onUpdate, onRemove, onToggleSkill,
}: {
  row: EditRow;
  idx: number;
  positions: Position[];
  allSkills: Skill[];
  onPositionChange: (i: number, posId: string) => void;
  onUpdate: (i: number, patch: Partial<EditRow>) => void;
  onRemove: (i: number) => void;
  onToggleSkill: (rowIdx: number, skillId: number) => void;
}) {
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const inputCls = 'bg-white/5 border border-parchment-100/15 text-parchment-100 rounded px-2 py-1 text-xs outline-none focus:border-verde-500 w-full transition-colors';

  return (
    <tr className="border-b border-parchment-100/5">
      <td className="py-1.5 pr-2 text-parchment-400/50 font-mono">{idx + 1}</td>
      <td className="py-1.5 pr-2">
        <input type="text" value={row.playerName} onChange={(e) => onUpdate(idx, { playerName: e.target.value })}
          placeholder="Opcional" className={inputCls} />
      </td>
      <td className="py-1.5 pr-2">
        <select value={row.positionId ?? ''} onChange={(e) => onPositionChange(idx, e.target.value)}
          className="bg-white/5 border border-parchment-100/15 text-parchment-100 rounded px-2 py-1 text-xs outline-none focus:border-verde-500 w-full">
          <option value="">Seleccionar…</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" min={0} value={row.spp} onChange={(e) => onUpdate(idx, { spp: Math.max(0, Number(e.target.value)) })}
          className="bg-white/5 border border-parchment-100/15 text-parchment-100 text-center rounded px-1 py-1 text-xs outline-none focus:border-verde-500 w-12" />
      </td>
      <td className="py-1.5 pr-2">
        <select value={row.injuries} onChange={(e) => onUpdate(idx, { injuries: e.target.value })}
          className="bg-white/5 border border-parchment-100/15 text-parchment-100 rounded px-2 py-1 text-xs outline-none focus:border-verde-500 w-full">
          {INJURY_OPTIONS.map((o) => <option key={o} value={o}>{o || 'Sin lesión'}</option>)}
        </select>
      </td>
      <td className="py-1.5 pr-2 relative">
        <div className="flex flex-wrap gap-1 items-center">
          {row.additionalSkillIds.map((id) => {
            const skill = allSkills.find((s) => s.id === id);
            return skill ? (
              <span key={id} className="bg-verde-500/15 text-verde-400 border border-verde-500/20 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                {skill.name}
                <button type="button" onClick={() => onToggleSkill(idx, id)} className="text-verde-400/60 hover:text-dragon-400 leading-none">×</button>
              </span>
            ) : null;
          })}
          <button type="button" onClick={() => setShowSkillPicker(!showSkillPicker)}
            className="text-parchment-400/50 hover:text-verde-400 text-xs border border-parchment-100/15 rounded px-1.5 py-0.5 transition-colors">
            + Skill
          </button>
        </div>
        {showSkillPicker && (
          <div className="absolute top-full left-0 z-30 mt-1 bg-carbon-900 border border-parchment-100/15 rounded shadow-xl max-h-48 overflow-y-auto w-48">
            {allSkills.filter((s) => !row.additionalSkillIds.includes(s.id)).map((s) => (
              <button key={s.id} type="button"
                onClick={() => { onToggleSkill(idx, s.id); setShowSkillPicker(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-parchment-300 hover:bg-parchment-100/10 transition-colors">
                <span className="font-medium">{s.name}</span>
                <span className="text-parchment-400/50 ml-1.5 text-[10px]">{s.category}</span>
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="py-1.5">
        <button type="button" onClick={() => onRemove(idx)}
          className="text-parchment-400/40 hover:text-dragon-400 transition-colors text-base leading-none">×</button>
      </td>
    </tr>
  );
}
