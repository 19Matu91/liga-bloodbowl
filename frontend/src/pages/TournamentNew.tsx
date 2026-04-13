import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { TournamentFormat } from '../types';

export default function TournamentNew() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    edition: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    description: '',
    format: 'MIXED' as TournamentFormat,
    groupCount: 2,
    qualifiersPerGroup: 2,
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.edition.trim() || !form.startDate) {
      setError('Nombre, edición y fecha de inicio son obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        edition: form.edition.trim(),
        year: Number(form.year),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        description: form.description.trim() || undefined,
        format: form.format,
        ...(form.format === 'MIXED'
          ? { groupCount: Number(form.groupCount), qualifiersPerGroup: Number(form.qualifiersPerGroup) }
          : {}),
      };
      const created = await api.create(payload);
      navigate(`/tournaments/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear torneo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Nuevo torneo</h1>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre *">
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
            placeholder="Torneo de Primavera"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Edición *">
            <input
              type="text"
              value={form.edition}
              onChange={(e) => set('edition', e.target.value)}
              className={inputClass}
              placeholder="I"
              required
            />
          </Field>
          <Field label="Año *">
            <input
              type="number"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              className={inputClass}
              min={2000}
              max={2100}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicio *">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Fecha fin">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className={`${inputClass} h-20 resize-none`}
            placeholder="Descripción opcional del torneo…"
          />
        </Field>

        <Field label="Formato">
          <select
            value={form.format}
            onChange={(e) => set('format', e.target.value as TournamentFormat)}
            className={inputClass}
          >
            <option value="MIXED">Mixto (Grupos + Eliminatoria)</option>
            <option value="SINGLE_ELIMINATION">Eliminación directa</option>
            <option value="ROUND_ROBIN">Liguilla completa</option>
          </select>
        </Field>

        {form.format === 'MIXED' && (
          <div className="grid grid-cols-2 gap-4 bg-gray-900 border border-gray-700 rounded p-4">
            <Field label="Número de grupos">
              <input
                type="number"
                value={form.groupCount}
                onChange={(e) => set('groupCount', e.target.value)}
                className={inputClass}
                min={2}
                max={16}
              />
            </Field>
            <Field label="Clasificados por grupo">
              <input
                type="number"
                value={form.qualifiersPerGroup}
                onChange={(e) => set('qualifiersPerGroup', e.target.value)}
                className={inputClass}
                min={1}
                max={8}
              />
            </Field>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded font-medium transition-colors"
          >
            {submitting ? 'Creando…' : 'Crear torneo'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/tournaments')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full bg-gray-900 border border-gray-700 focus:border-red-700 text-white rounded px-3 py-2 text-sm outline-none transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1">{label}</label>
      {children}
    </div>
  );
}
