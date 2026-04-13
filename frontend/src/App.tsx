import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import TournamentList from './pages/TournamentList';
import TournamentNew from './pages/TournamentNew';
import TournamentDetail from './pages/TournamentDetail';
import PlayerList from './pages/PlayerList';
import PlayerNew from './pages/PlayerNew';
import PlayerDetail from './pages/PlayerDetail';
import StatsPage from './pages/StatsPage';
import NotFound from './pages/NotFound';

function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium transition-colors ${
      isActive
        ? 'bg-red-900 text-white'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  return (
    <nav className="bg-gray-900 border-b border-red-900/40 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-red-600 text-xl font-bold">🏆</span>
            <span className="text-white font-bold text-sm sm:text-base hidden sm:block">
              El Dragón de Madera
            </span>
            <span className="text-white font-bold text-sm sm:hidden">EDM</span>
          </NavLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/tournaments" className={linkClass}>Torneos</NavLink>
            <NavLink to="/players" className={linkClass}>Jugadores</NavLink>
            <NavLink to="/stats" className={linkClass}>Estadísticas</NavLink>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 flex flex-col gap-1" onClick={() => setOpen(false)}>
            <NavLink to="/tournaments" className={linkClass}>Torneos</NavLink>
            <NavLink to="/players" className={linkClass}>Jugadores</NavLink>
            <NavLink to="/stats" className={linkClass}>Estadísticas</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<TournamentList />} />
            <Route path="/tournaments/new" element={<TournamentNew />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/players" element={<PlayerList />} />
            <Route path="/players/new" element={<PlayerNew />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
