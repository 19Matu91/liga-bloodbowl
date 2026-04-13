import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-6xl mb-4">🏈</p>
      <h1 className="font-display text-4xl font-bold text-parchment-100 mb-2">404</h1>
      <p className="text-parchment-400 mb-8">Esta página no existe en el campo de juego</p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  );
}
