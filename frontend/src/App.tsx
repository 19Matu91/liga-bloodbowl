import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import TournamentList from './pages/TournamentList';
import TournamentNew from './pages/TournamentNew';
import TournamentDetail from './pages/TournamentDetail';
import TournamentEdit from './pages/TournamentEdit';
import PlayerList from './pages/PlayerList';
import PlayerNew from './pages/PlayerNew';
import PlayerDetail from './pages/PlayerDetail';
import StatsPage from './pages/StatsPage';
import NotFound from './pages/NotFound';
import { DragonIcon, DragonWordmark } from './components/DragonLogo';

function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-verde-500 text-white'
        : 'text-parchment-300 hover:text-parchment-100 hover:bg-black/5'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 backdrop-blur-sm bg-carbon-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo — igual que dragondemadera.com */}
          <NavLink to="/" className="flex items-center gap-3 group flex-shrink-0">
            <DragonIcon className="h-9 w-9 text-verde-500 flex-shrink-0" />
            <div className="hidden sm:flex flex-col leading-none gap-0.5">
              <DragonWordmark className="h-[17px] w-auto text-parchment-100" />
              <span className="text-parchment-400 text-[9px] tracking-[0.18em] uppercase font-sans">
                Blood Bowl · Granada
              </span>
            </div>
            <span className="text-parchment-100 font-semibold text-sm sm:hidden">EDM</span>
          </NavLink>

          {/* Desktop nav — Gemunu Libre como EDM */}
          <nav className="hidden md:flex items-center gap-0.5">
            <NavLink to="/tournaments" className={linkClass}>Torneos</NavLink>
            <NavLink to="/players" className={linkClass}>Jugadores</NavLink>
            <NavLink to="/stats" className={linkClass}>Estadísticas</NavLink>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-parchment-400 hover:text-parchment-100 hover:bg-black/5 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3 pt-1 flex flex-col gap-1 border-t border-black/10 mt-1" onClick={() => setOpen(false)}>
            <NavLink to="/tournaments" className={linkClass}>Torneos</NavLink>
            <NavLink to="/players" className={linkClass}>Jugadores</NavLink>
            <NavLink to="/stats" className={linkClass}>Estadísticas</NavLink>
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    /* Footer verde igual que dragondemadera.com: bg-primary text-background */
    <footer className="bg-verde-500 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <DragonIcon className="h-8 w-8 text-white/80 flex-shrink-0" />
          <div>
            <DragonWordmark className="h-[15px] w-auto text-white" />
            <p className="text-white/60 text-[10px] tracking-[0.18em] uppercase mt-1">
              Blood Bowl · Granada
            </p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-white/70 text-sm font-semibold">Liga privada</p>
          <p className="text-white/40 text-xs mt-0.5">Solo uso interno del club</p>
        </div>
      </div>
    </footer>
  );
}

/* Wrapper para páginas interiores (con container y padding) */
function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="min-h-screen bg-carbon-900 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Home tiene su propio layout (hero full-bleed) */}
            <Route path="/" element={<Home />} />
            {/* Páginas interiores con container */}
            <Route path="/tournaments" element={<PageContainer><TournamentList /></PageContainer>} />
            <Route path="/tournaments/new" element={<PageContainer><TournamentNew /></PageContainer>} />
            <Route path="/tournaments/:id" element={<PageContainer><TournamentDetail /></PageContainer>} />
            <Route path="/tournaments/:id/edit" element={<PageContainer><TournamentEdit /></PageContainer>} />
            <Route path="/players" element={<PageContainer><PlayerList /></PageContainer>} />
            <Route path="/players/new" element={<PageContainer><PlayerNew /></PageContainer>} />
            <Route path="/players/:id" element={<PageContainer><PlayerDetail /></PageContainer>} />
            <Route path="/stats" element={<PageContainer><StatsPage /></PageContainer>} />
            <Route path="*" element={<PageContainer><NotFound /></PageContainer>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
