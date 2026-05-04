import { useState, useCallback } from 'react';
import type { Position } from '../types';
import Th from './ui/Th';

export interface RosterRow {
  number: number;
  playerName: string;
  positionId: number | null;
  ma: number;
  st: number;
  ag: number;
  pa: number | null;
  av: number;
  skills: string[];
  value: number;
}

export interface TeamSheetData {
  rerolls: number;
  hasApothecary: boolean;
  roster: RosterRow[];
}

interface Props {
  teamName: string;
  raceName: string;
  rerollCost: number;
  positions: Position[];
  value: TeamSheetData;
  onChange: (data: TeamSheetData) => void;
}

const TREASURY = 1_000_000;
const APOTHECARY_COST = 50_000;
const MAX_ROSTER = 16;

function formatGold(n: number): string {
  return n.toLocaleString('es-ES') + ' MO';
}

export default function TeamSheetForm({ teamName, raceName, rerollCost, positions, value, onChange }: Props) {
  const { rerolls, hasApothecary, roster } = value;

  const teamValue =
    roster.reduce((sum, r) => sum + r.value, 0) +
    rerolls * rerollCost +
    (hasApothecary ? APOTHECARY_COST : 0);

  const update = useCallback(
    (patch: Partial<TeamSheetData>) => onChange({ ...value, ...patch }),
    [value, onChange]
  );

  const addPlayer = () => {
    if (roster.length >= MAX_ROSTER) return;
    const number = roster.length + 1;
    update({
      roster: [
        ...roster,
        { number, playerName: '', positionId: null, ma: 0, st: 0, ag: 0, pa: null, av: 0, skills: [], value: 0 },
      ],
    });
  };

  const removePlayer = (idx: number) => {
    const next = roster.filter((_, i) => i !== idx).map((r, i) => ({ ...r, number: i + 1 }));
    update({ roster: next });
  };

  const updateRow = (idx: number, patch: Partial<RosterRow>) => {
    const next = roster.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    update({ roster: next });
  };

  const handlePositionChange = (idx: number, posId: string) => {
    const pos = positions.find((p) => p.id === Number(posId));
    if (!pos) {
      updateRow(idx, { positionId: null, ma: 0, st: 0, ag: 0, pa: null, av: 0, skills: [], value: 0 });
      return;
    }
    const baseSkills = pos.skills.map((ps) => ps.skill.name);
    updateRow(idx, {
      positionId: pos.id,
      ma: pos.ma,
      st: pos.st,
      ag: pos.ag,
      pa: pos.pa,
      av: pos.av,
      skills: baseSkills,
      value: pos.cost,
    });
  };

  const inputCls = 'bg-white border border-black/15 text-parchment-100 rounded px-2 py-1 text-sm outline-none focus:border-verde-500 w-full transition-colors';
  const statCls = 'bg-white border border-black/15 text-parchment-100 rounded px-1 py-1 text-sm outline-none focus:border-verde-500 w-12 text-center transition-colors';

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-black/10 rounded-lg p-3 text-sm">
        <div>
          <p className="text-parchment-400 text-xs mb-0.5">Equipo</p>
          <p className="text-parchment-100 font-medium">{teamName || '—'}</p>
        </div>
        <div>
          <p className="text-parchment-400 text-xs mb-0.5">Raza</p>
          <p className="text-parchment-100 font-medium">{raceName}</p>
        </div>
        <div>
          <p className="text-parchment-400 text-xs mb-0.5">Tesorería</p>
          <p className="text-terracota-500 font-medium">{formatGold(TREASURY)}</p>
        </div>
        <div>
          <p className="text-parchment-400 text-xs mb-0.5">Valor de equipo</p>
          <p className="text-terracota-500 font-bold">{formatGold(teamValue)}</p>
        </div>
      </div>

      {/* Re-rolls & Apothecary */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-parchment-400 text-xs mb-1">
            Re-rolls {rerollCost > 0 && <span className="text-parchment-400/60">({formatGold(rerollCost)} c/u)</span>}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={8}
              value={rerolls}
              onChange={(e) => update({ rerolls: Math.max(0, Math.min(8, Number(e.target.value))) })}
              className="bg-white border border-black/15 text-parchment-100 rounded px-2 py-1.5 text-sm outline-none focus:border-verde-500 w-20 text-center transition-colors"
            />
            {rerollCost > 0 && (
              <span className="text-parchment-400 text-xs">= {formatGold(rerolls * rerollCost)}</span>
            )}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasApothecary}
              onChange={(e) => update({ hasApothecary: e.target.checked })}
              className="w-4 h-4 accent-verde-500"
            />
            <span className="text-parchment-300 text-sm">
              Apotecario <span className="text-parchment-400 text-xs">({formatGold(APOTHECARY_COST)})</span>
            </span>
          </label>
        </div>
      </div>

      {/* Roster table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-parchment-300">
            Plantilla ({roster.length}/{MAX_ROSTER})
          </h4>
          {roster.length < MAX_ROSTER && (
            <button
              type="button"
              onClick={addPlayer}
              className="bg-gray-100 hover:bg-gray-200 border border-black/10 text-parchment-300 px-3 py-1 rounded text-xs transition-colors"
            >
              + Añadir jugador
            </button>
          )}
        </div>

        {roster.length === 0 ? (
          <p className="text-parchment-400/60 italic text-sm">Sin jugadores. Pulsa "+ Añadir jugador".</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-parchment-400 text-left">
                    <Th tooltip="Dorsal — número del jugador en la plantilla" align="center" className="pb-1.5 pr-2 w-8">Nº</Th>
                    <th className="pb-1.5 pr-2 min-w-[100px]">Nombre</th>
                    <th className="pb-1.5 pr-2 min-w-[140px]">Posición</th>
                    <Th tooltip="Movimiento — número de casillas que puede moverse el jugador por turno" align="center" className="pb-1.5 pr-2 w-12">MA</Th>
                    <Th tooltip="Fuerza — valor de fuerza para bloqueos y resistencia (mayor es mejor)" align="center" className="pb-1.5 pr-2 w-12">ST</Th>
                    <Th tooltip="Agilidad — dificultad para coger, pasar y esquivar (menor es mejor)" align="center" className="pb-1.5 pr-2 w-12">AG</Th>
                    <Th tooltip="Pase — dificultad para pasar el balón (menor es mejor). '—' indica que el jugador no puede pasar" align="center" className="pb-1.5 pr-2 w-12">PA</Th>
                    <Th tooltip="Armadura — dificultad para derribar al jugador tras un bloqueo (mayor es mejor)" align="center" className="pb-1.5 pr-2 w-12">AV</Th>
                    <th className="pb-1.5 pr-2 min-w-[120px]">Habilidades</th>
                    <Th tooltip="Valor del jugador en miles de monedas de oro (MO)" align="right" className="pb-1.5 pr-2 w-20">Valor</Th>
                    <th className="pb-1.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row, idx) => (
                    <RosterRowDesktop
                      key={idx}
                      row={row}
                      idx={idx}
                      positions={positions}
                      onPositionChange={handlePositionChange}
                      onUpdate={updateRow}
                      onRemove={removePlayer}
                      inputCls={inputCls}
                      statCls={statCls}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {roster.map((row, idx) => (
                <RosterRowMobile
                  key={idx}
                  row={row}
                  idx={idx}
                  positions={positions}
                  onPositionChange={handlePositionChange}
                  onUpdate={updateRow}
                  onRemove={removePlayer}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Desktop row ───────────────────────────────────────────────────────────────

interface RowProps {
  row: RosterRow;
  idx: number;
  positions: Position[];
  onPositionChange: (idx: number, posId: string) => void;
  onUpdate: (idx: number, patch: Partial<RosterRow>) => void;
  onRemove: (idx: number) => void;
  inputCls: string;
  statCls: string;
}

function RosterRowDesktop({ row, idx, positions, onPositionChange, onUpdate, onRemove, inputCls, statCls }: RowProps) {
  return (
    <tr className="border-b border-black/5">
      <td className="py-1.5 pr-2 text-parchment-400 text-center">{row.number}</td>
      <td className="py-1.5 pr-2">
        <input
          type="text"
          value={row.playerName}
          onChange={(e) => onUpdate(idx, { playerName: e.target.value })}
          placeholder="Opcional"
          className={inputCls}
        />
      </td>
      <td className="py-1.5 pr-2">
        <PositionSelect
          positions={positions}
          currentPosId={row.positionId}
          idx={idx}
          onChange={onPositionChange}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" value={row.ma} onChange={(e) => onUpdate(idx, { ma: Number(e.target.value) })} className={statCls} />
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" value={row.st} onChange={(e) => onUpdate(idx, { st: Number(e.target.value) })} className={statCls} />
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" value={row.ag} onChange={(e) => onUpdate(idx, { ag: Number(e.target.value) })} className={statCls} />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="text"
          value={row.pa !== null ? String(row.pa) : '—'}
          onChange={(e) => {
            const v = e.target.value.trim();
            onUpdate(idx, { pa: v === '—' || v === '' ? null : Number(v) });
          }}
          className={statCls}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" value={row.av} onChange={(e) => onUpdate(idx, { av: Number(e.target.value) })} className={statCls} />
      </td>
      <td className="py-1.5 pr-2">
        <SkillsEditor skills={row.skills} onChange={(skills) => onUpdate(idx, { skills })} />
      </td>
      <td className="py-1.5 pr-2 text-right text-terracota-500 whitespace-nowrap">
        {row.value > 0 ? (row.value / 1000).toFixed(0) + 'k' : '—'}
      </td>
      <td className="py-1.5">
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="text-parchment-400/50 hover:text-dragon-400 transition-colors text-base leading-none"
          title="Eliminar"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function RosterRowMobile({ row, idx, positions, onPositionChange, onUpdate, onRemove }: Omit<RowProps, 'inputCls' | 'statCls'>) {
  const inputCls = 'bg-white border border-black/15 text-parchment-100 rounded px-2 py-1.5 text-sm outline-none focus:border-verde-500 w-full transition-colors';
  const statCls = 'bg-white border border-black/15 text-parchment-100 rounded px-1 py-1.5 text-sm outline-none focus:border-verde-500 w-full text-center transition-colors';

  return (
    <div className="bg-gray-50 border border-black/10 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-parchment-400 text-xs font-bold">#{row.number}</span>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="text-parchment-400/50 hover:text-dragon-400 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-parchment-400 text-xs">Nombre</label>
          <input
            type="text"
            value={row.playerName}
            onChange={(e) => onUpdate(idx, { playerName: e.target.value })}
            placeholder="Opcional"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-parchment-400 text-xs">Posición</label>
          <PositionSelect
            positions={positions}
            currentPosId={row.positionId}
            idx={idx}
            onChange={onPositionChange}
          />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {(['ma', 'st', 'ag', 'av'] as const).map((stat) => (
          <div key={stat}>
            <label className="text-parchment-400 text-xs uppercase">{stat}</label>
            <input
              type="number"
              value={row[stat]}
              onChange={(e) => onUpdate(idx, { [stat]: Number(e.target.value) })}
              className={statCls}
            />
          </div>
        ))}
        <div>
          <label className="text-parchment-400 text-xs uppercase">PA</label>
          <input
            type="text"
            value={row.pa !== null ? String(row.pa) : '—'}
            onChange={(e) => {
              const v = e.target.value.trim();
              onUpdate(idx, { pa: v === '—' || v === '' ? null : Number(v) });
            }}
            className={statCls}
          />
        </div>
      </div>
      <div>
        <label className="text-parchment-400 text-xs">Habilidades</label>
        <SkillsEditor skills={row.skills} onChange={(skills) => onUpdate(idx, { skills })} />
      </div>
      {row.value > 0 && (
        <p className="text-right text-terracota-500 text-xs">{(row.value / 1000).toFixed(0)}k MO</p>
      )}
    </div>
  );
}

// ── Position selector ─────────────────────────────────────────────────────────

function PositionSelect({
  positions,
  currentPosId,
  idx,
  onChange,
}: {
  positions: Position[];
  currentPosId: number | null;
  idx: number;
  onChange: (idx: number, posId: string) => void;
}) {
  return (
    <select
      value={currentPosId ?? ''}
      onChange={(e) => onChange(idx, e.target.value)}
      className="bg-white border border-black/15 text-parchment-100 rounded px-2 py-1 text-xs outline-none focus:border-verde-500 w-full transition-colors"
    >
      <option value="">Seleccionar…</option>
      {positions.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({(p.cost / 1000).toFixed(0)}k)
        </option>
      ))}
    </select>
  );
}

// ── Skills editor ─────────────────────────────────────────────────────────────

function SkillsEditor({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const add = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setNewSkill('');
    setAdding(false);
  };

  const remove = (skill: string) => onChange(skills.filter((s) => s !== skill));

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {skills.map((s) => (
        <span
          key={s}
          className="bg-verde-500/10 text-verde-500 border border-verde-500/20 text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
        >
          {s}
          <button
            type="button"
            onClick={() => remove(s)}
            className="text-verde-500/60 hover:text-dragon-400 leading-none"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Escape') { setAdding(false); setNewSkill(''); } }}
          onBlur={add}
          className="bg-white border border-black/15 text-parchment-100 rounded px-1.5 py-0.5 text-xs outline-none focus:border-verde-500 w-24"
          placeholder="Habilidad…"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-parchment-400/50 hover:text-verde-500 text-xs transition-colors"
          title="Añadir habilidad"
        >
          +
        </button>
      )}
    </div>
  );
}
