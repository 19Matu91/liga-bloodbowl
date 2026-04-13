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
    `px-3 py-2 rounded text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-dragon-500 text-parchment-100'
        : 'text-parchment-300 hover:bg-parchment-100/8 hover:text-parchment-100'
    }`;

  return (
    <nav className="bg-carbon-900 border-b border-parchment-100/10 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <span className="text-dragon-500 text-xl">🐉</span>
            <div className="hidden sm:block">
              <span className="text-parchment-100 font-display font-bold text-sm tracking-wide">
                El Dragón de Madera
              </span>
              <span className="text-parchment-400 text-xs ml-2 hidden md:inline">Blood Bowl</span>
            </div>
            <span className="text-parchment-100 font-bold text-sm sm:hidden">EDM</span>
          </NavLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/tournaments" className={linkClass}>Torneos</NavLink>
            <NavLink to="/players" className={linkClass}>Jugadores</NavLink>
            <NavLink to="/stats" className={linkClass}>Estadísticas</NavLink>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded text-parchment-400 hover:text-parchment-100 hover:bg-parchment-100/8 transition-colors"
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
          <div className="md:hidden pb-3 pt-1 flex flex-col gap-1 border-t border-parchment-100/10 mt-1" onClick={() => setOpen(false)}>
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
      <div className="min-h-screen bg-carbon-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <footer className="border-t border-parchment-100/10 mt-16 py-6 text-center text-parchment-400/50 text-xs">
          El Dragón de Madera · Blood Bowl League Manager
        </footer>
      </div>
    </BrowserRouter>
  );
}
