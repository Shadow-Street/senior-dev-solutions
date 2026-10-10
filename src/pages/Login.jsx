import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/components/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

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
  const { login, user, loading: authLoading } = useAuth();

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

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    setFormError('');
    try {
      if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.oauth2
          .initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'email profile',
            callback: async (tokenResponse) => {
              if (!tokenResponse.access_token) return;
              try {
                const response = await apiClient.post('/auth/google', {
                  accessToken: tokenResponse.access_token,
                });
                localStorage.setItem('accessToken', response.data.accessToken);
                if (response.data.refreshToken) {
                  localStorage.setItem('refreshToken', response.data.refreshToken);
                }
                localStorage.setItem('user', JSON.stringify(response.data.user));
                toast.success('Welcome back');
                goHome(response.data.user);
              } catch (error) {
                const message = error.response?.data?.error || 'Google sign-in failed.';
                setFormError(message);
                toast.error(message);
              }
            },
          })
          .requestAccessToken();
      } else {
        const message = 'Google sign-in is not configured for this environment.';
        setFormError(message);
        toast.error(message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      setFormError('Google sign-in failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setSocialLoading('facebook');
    setFormError('');
    try {
      if (typeof FB !== 'undefined') {
        FB.login(
          async (response) => {
            if (!response.authResponse) return;
            try {
              const result = await apiClient.post('/auth/facebook', {
                accessToken: response.authResponse.accessToken,
              });
              localStorage.setItem('accessToken', result.data.accessToken);
              if (result.data.refreshToken) {
                localStorage.setItem('refreshToken', result.data.refreshToken);
              }
              localStorage.setItem('user', JSON.stringify(result.data.user));
              toast.success('Welcome back');
              goHome(result.data.user);
            } catch (error) {
              const message = error.response?.data?.error || 'Facebook sign-in failed.';
              setFormError(message);
              toast.error(message);
            }
          },
          { scope: 'email,public_profile' }
        );
      } else {
        const message = 'Facebook sign-in is not configured for this environment.';
        setFormError(message);
        toast.error(message);
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      setFormError('Facebook sign-in failed. Please try again.');
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={busy}
          className="h-11"
        >
          {socialLoading === 'google' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
            </svg>
          )}
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleFacebookLogin}
          disabled={busy}
          className="h-11"
        >
          {socialLoading === 'facebook' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
            </svg>
          )}
          Facebook
        </Button>
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
