import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/components/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

// GIS calls back without a credential when Google could not complete the
// sign-in (closing the popup usually calls nothing at all).
const GOOGLE_NO_CREDENTIAL = 'Google sign-in did not complete. Please try again.';

/** Where each role lands after signing in. */
const ROLE_HOME = {
  super_admin: '/SuperAdmin',
  admin: '/AdminPanel',
  sub_admin: '/AdminPanel',
  advisor: '/AdvisorDashboard',
  finfluencer: '/FinfluencerDashboard',
  portfolio_manager: '/PMDashboard',
  user: '/Dashboard',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, user, loading: authLoading } = useAuth();
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  // The GIS button takes a pixel width (Google caps it at 400); keep it
  // matched to the form column, including after rotation or resize.
  const googleSlotRef = useRef(null);
  const [googleWidth, setGoogleWidth] = useState(undefined);
  useLayoutEffect(() => {
    const el = googleSlotRef.current;
    if (!el) return undefined;
    const measure = () => {
      if (el.clientWidth) setGoogleWidth(Math.min(400, Math.floor(el.clientWidth)));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [googleEnabled]);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  /**
   * Shown inline above the form.
   *
   * A toast alone was not enough here: the only Toaster mounted on this page
   * used to be the shadcn one, which never renders sonner toasts, so a wrong
   * password produced complete silence. An inline message cannot be missed,
   * does not time out, and stays readable for screen readers.
   */
  const [formError, setFormError] = useState('');

  /**
   * Someone who already has a session should not be shown a sign-in form.
   *
   * This also covers the cross-tab case: sign in in one tab and a second tab
   * sitting on /login receives the session through the storage event, so it
   * should move on rather than keep asking for credentials.
   */
  useEffect(() => {
    if (!authLoading && user) goHome(user);
    // goHome is stable for this purpose; re-running on user/loading is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  /**
   * Redirect by the role the *server* reported.
   *
   * The form used to carry a "Login as" dropdown and route on that. The
   * backend reads the role from the account and ignores whatever the client
   * sends, so choosing "Advisor" never granted anything — it only redirected
   * to a dashboard the person could not open, which read as a broken login.
   */
  const goHome = (user) => {
    const from = location.state?.from?.pathname;
    if (from && !/^\/(login|register|forgot-password|reset-password)/i.test(from)) {
      navigate(from, { replace: true });
      return;
    }
    const role = user?.app_role || user?.role || 'user';
    navigate(ROLE_HOME[role] || '/Dashboard', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const email = formData.email.trim();
    if (!email || !formData.password) {
      setFormError('Enter your email and password to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('That email address does not look right.');
      return;
    }

    setIsLoading(true);
    try {
      // Through the auth context, not authAPI directly: calling the API on its
      // own stored the token but left the context's `user` null, so the app
      // shell kept rendering "Guest" and prompting for a login that had
      // already happened.
      const data = await login(email, formData.password);
      toast.success('Welcome back');
      goHome(data?.user);
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.error || error?.response?.data?.message;
      const message =
        status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : !error?.response
            ? 'Cannot reach the server. Check your connection and try again.'
            : serverMessage || 'Sign in failed. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Google Identity Services hands back an ID token (`credential`); the server
   * verifies it against GOOGLE_CLIENT_ID and opens the session. The old flow
   * sent an OAuth access token under the wrong field, so it never worked.
   */
  const handleGoogleCredential = async ({ credential } = {}) => {
    if (!credential) {
      setFormError(GOOGLE_NO_CREDENTIAL);
      return;
    }
    setSocialLoading('google');
    setFormError('');
    try {
      const data = await googleLogin(credential);
      toast.success('Welcome back');
      goHome(data?.user);
    } catch (error) {
      const status = error?.response?.status;
      const message =
        status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : !error?.response
            ? 'Cannot reach the server. Check your connection and try again.'
            : error.response.data?.error || 'Google sign-in failed. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  };

  const busy = isLoading || Boolean(socialLoading);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Protocall account."
      footer={
        <span className="text-muted-foreground">
          Don&rsquo;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </span>
      }
    >
      {/* Shown only when the build has a Google client id; without one the
          GIS button cannot work, so the page offers email sign-in alone. */}
      {googleEnabled && (
        <>
          <div ref={googleSlotRef} className="relative flex min-h-11 justify-center" aria-busy={busy}>
            <GoogleLogin
              onSuccess={handleGoogleCredential}
              onError={() => setFormError(GOOGLE_NO_CREDENTIAL)}
              text="continue_with"
              theme="outline"
              size="large"
              shape="rectangular"
              logo_alignment="center"
              width={googleWidth}
            />
            {/* Covers the button during any sign-in, so email and Google
                attempts cannot race each other. */}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-card/80">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span className="sr-only" role="status">
                  {socialLoading === 'google' ? 'Signing in with Google…' : 'Signing in…'}
                </span>
              </div>
            )}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>
        </>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={busy}
            aria-invalid={Boolean(formError)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={busy}
              aria-invalid={Boolean(formError)}
              className="h-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={busy} className="h-11 w-full text-base">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
