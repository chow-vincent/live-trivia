import { useAuth, useClerk } from '@clerk/clerk-react';
import { Outlet, Navigate } from 'react-router-dom';

export default function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <>
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={() => signOut()}
          className="text-base font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          Sign out
        </button>
      </div>
      <Outlet />
    </>
  );
}
