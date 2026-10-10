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
  const { user, loading } = useAuth();

  if (loading) {
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

  // Same precedence as the backend's adminMiddleware and every other role check
  // in the app: app_role first, then role. Reading `role` alone locked advisors
  // out of their own dashboard, because approval promotes `app_role` and leaves
  // `role` at its registration value.
  const userRole = user.app_role || user.role;

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
