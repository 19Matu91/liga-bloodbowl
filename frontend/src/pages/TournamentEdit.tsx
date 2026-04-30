import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tournaments as api } from '../api/client';
import type { TournamentFormat } from '../types';
import FormatSelector from '../components/FormatSelector';
import { Spinner } from '../components/ui/Spinner';

export default function TournamentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tournamentId = Number(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', edition: '', year: new Date().getFullYear(),
    startDate: '', description: '',
    format: 'MIXED' as TournamentFormat,
    groupCount: 2, qualifiersPerGroup: 2,
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    api.getById(tournamentId)
      .then((t) => {
        setForm({
          name: t.name,
          edition: t.edition,
          year: t.year,
          startDate: t.startDate.slice(0, 10),
          description: t.description ?? '',
          format: t.format,
          groupCount: t.groupCount ?? 2,
          qualifiersPerGroup: t.qualifiersPerGroup ?? 2,
        });
      })
      .catch(() => setError('No se pudo cargar el torneo.'))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.edition.trim() || !form.startDate) {
      setError('Nombre, edición y fecha de inicio son obligatorios.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.update(tournamentId, {
        name: form.name.trim(),
        edition: form.edition.trim(),
        year: Number(form.year),
        startDate: form.startDate,
        description: form.description.trim() || undefined,
        format: form.format,
        groupCount: form.format !== 'SINGLE_ELIMINATION' ? form.groupCount : undefined,
        qualifiersPerGroup: form.format === 'MIXED' ? form.qualifiersPerGroup : undefined,
      });
      navigate(`/tournaments/${tournamentId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar torneo');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="md" className="text-parchment-400/40" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to={`/tournaments/${tournamentId}`} className="text-parchment-400 hover:text-parchment-300 text-sm transition-colors">
          ← Volver al torneo
        </Link>
        <h1 className="font-display text-2xl font-bold text-parchment-100 mt-2">Editar torneo</h1>
      </div>

      {error && (
        <div className="bg-dragon-500/10 border border-dragon-500/30 text-dragon-300 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Nombre *</label>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="Nombre del torneo" required />
            </div>
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Edición *</label>
              <input type="text" value={form.edition} onChange={(e) => set('edition', e.target.value)} className="input-field" placeholder="Ej: I, II, 2025…" required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Año *</label>
              <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} className="input-field" min={2000} max={2100} required />
            </div>
            <div>
              <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Fecha inicio *</label>
              <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-2">Formato</label>
            <FormatSelector value={form.format} onChange={(f) => set('format', f)} />
          </div>

          {form.format !== 'SINGLE_ELIMINATION' && (
            <div className="grid sm:grid-cols-2 gap-4 p-4 bg-carbon-900 rounded-lg border border-parchment-100/10">
              <div>
                <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Número de grupos</label>
                <input type="number" value={form.groupCount} onChange={(e) => set('groupCount', Number(e.target.value))} className="input-field" min={1} max={16} />
              </div>
              {form.format === 'MIXED' && (
                <div>
                  <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Clasificados por grupo</label>
                  <input type="number" value={form.qualifiersPerGroup} onChange={(e) => set('qualifiersPerGroup', Number(e.target.value))} className="input-field" min={1} max={8} />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">Descripción</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="input-field resize-none" rows={3} placeholder="Descripción opcional del torneo" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-parchment-100/10">
            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-1.5">
              {submitting && <Spinner size="sm" />}
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => navigate(`/tournaments/${tournamentId}`)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
