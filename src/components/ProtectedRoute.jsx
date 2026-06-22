/* ProtectedRoute — wraps any route that requires authentication.
   Shows a loading spinner while Supabase checks the session,
   then either renders children or redirects to /signin. */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  /* While Supabase is checking localStorage / refreshing the token,
     show a minimal centered spinner so the page doesn't flash. */
  if (loading) {
    return (
      <div className="h" style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid var(--line-faint)',
            borderTopColor: 'var(--ink-2)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <div className="h-meta" style={{ fontSize: 13 }}>Loading…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* No session → send to sign-in */
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  /* Authenticated → render the child route */
  return <Outlet />;
}
