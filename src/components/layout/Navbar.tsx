import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const links = [
  { to: '/matches', label: 'Matches', icon: '⚽' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export function Navbar() {
  const { identity, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setOpen(false);
    await logOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-pitch-950/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <NavLink to="/matches" className="flex items-center gap-2 font-display text-lg font-bold tracking-wide text-chalk-100">
          <span className="text-2xl">🤡</span>
          <span className="hidden sm:inline">9 idiots WC</span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 font-display text-sm font-semibold tracking-wide transition-colors ${
                  isActive ? 'bg-turf-500/15 text-turf-400' : 'text-chalk-300 hover:text-chalk-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {identity && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
              <span>{identity.avatar || '⚽'}</span>
              <span className="font-medium text-chalk-100">{identity.name}</span>
            </div>
          )}
          {identity && (
            <button onClick={handleLogout} className="text-xs text-chalk-500 hover:text-chalk-300">
              Log out
            </button>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-chalk-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 bg-pitch-950/95 px-4 pb-4 md:hidden">
          {identity && (
            <div className="mb-3 mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span>{identity.avatar || '⚽'}</span>
              <span className="font-medium text-chalk-100">{identity.name}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2.5 font-display text-sm font-semibold ${
                    isActive ? 'bg-turf-500/15 text-turf-400' : 'text-chalk-300'
                  }`
                }
              >
                <span>{l.icon}</span> {l.label}
              </NavLink>
            ))}
            {identity && (
              <button onClick={handleLogout} className="mt-2 rounded-lg px-3 py-2.5 text-left text-sm text-chalk-500">
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
