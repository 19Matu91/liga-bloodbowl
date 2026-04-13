import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { players as api } from '../api/client';

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

  const inputClass = 'w-full bg-gray-900 border border-gray-700 focus:border-red-700 text-white rounded px-3 py-2 text-sm outline-none transition-colors';

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Nuevo jugador</h1>
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded p-3 mb-4 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Nombre completo"
            required
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded font-medium transition-colors">
            {submitting ? 'Creando…' : 'Crear jugador'}
          </button>
          <button type="button" onClick={() => navigate('/players')} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2 rounded font-medium transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
