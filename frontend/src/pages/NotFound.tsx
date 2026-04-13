import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <p className="text-8xl font-extrabold text-red-800 mb-4">404</p>
      <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
      <p className="text-gray-400 mb-8 max-w-sm">
        La página que buscas no existe o ha sido movida. Puede que el torneo o jugador que buscas no exista.
      </p>
      <Link
        to="/"
        className="bg-red-800 hover:bg-red-700 text-white px-6 py-2 rounded font-medium transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
