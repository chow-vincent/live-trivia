import { useAuth, useClerk, UserButton } from '@clerk/clerk-react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { setAuthTokenGetter } from '../lib/api.js';

export default function DashboardLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();

  // Wire up the API client with the auth token getter
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-300 border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-500'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <NavLink to="/host" className="text-lg font-bold text-slate-900">
              Live Trivia
            </NavLink>
            <nav className="hidden sm:flex items-center gap-1">
              <NavLink to="/host" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/host/games" className={linkClass}>
                Games
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
