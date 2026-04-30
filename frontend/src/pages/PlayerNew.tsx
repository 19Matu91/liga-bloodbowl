import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { players as api } from '../api/client';
import { Spinner } from '../components/ui/Spinner';

export default function PlayerNew() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.create({ name: name.trim() });
      navigate(`/players/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear jugador');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <Link to="/players" className="text-parchment-400 hover:text-parchment-300 text-sm transition-colors">
          ← Jugadores
        </Link>
        <h1 className="font-display text-2xl font-bold text-parchment-100 mt-2">Nuevo jugador</h1>
      </div>

      {error && (
        <div className="bg-dragon-500/10 border border-dragon-500/30 text-dragon-300 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-parchment-400 text-xs uppercase tracking-wider mb-1.5">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Nombre del jugador"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-1.5">
              {submitting && <Spinner size="sm" />}
              {submitting ? 'Creando…' : 'Crear jugador'}
            </button>
            <button type="button" onClick={() => navigate('/players')} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
