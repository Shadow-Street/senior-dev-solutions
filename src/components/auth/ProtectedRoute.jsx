import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/context/AuthContext';

/**
 * Gate for pages that require a session.
 *
 * This used to read localStorage directly, once, on mount. Two consequences:
 * a valid token with no cached `user` object was treated as signed out and
 * bounced to /login, and because it never re-ran, signing in from another tab
 * left this one stuck on the login redirect. It now reads the auth context,
 * which owns the session and keeps every tab in step.
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const { user, loading, refreshUser } = useAuth();
  const [rechecked, setRechecked] = useState(false);

  // Same precedence as the backend's adminMiddleware and every other role check
  // in the app: app_role first, then role. Reading `role` alone locked advisors
  // out of their own dashboard, because approval promotes `app_role` and leaves
  // `role` at its registration value.
  const userRole = user ? (user.app_role || user.role) : null;
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  // The cached user can be stale: an applicant approved by an admin while they
  // were signed in still carries role "user" until something re-reads it, so
  // following the "you were approved" link bounced them to /unauthorized. Before
  // refusing, re-read the user from the server once; the backend stays the
  // authority and a genuinely unauthorised user is still refused.
  const needsRecheck = Boolean(user) && !roleAllowed && !rechecked && typeof refreshUser === 'function';
  useEffect(() => {
    if (!needsRecheck) return undefined;
    let live = true;
    Promise.resolve(refreshUser()).finally(() => { if (live) setRechecked(true); });
    return () => { live = false; };
  }, [needsRecheck, refreshUser]);

  if (loading || needsRecheck) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
          <p className="mt-4 text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // `from` lets the login page send the visitor back where they were headed.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!roleAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
