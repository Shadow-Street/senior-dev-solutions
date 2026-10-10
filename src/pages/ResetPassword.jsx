import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'letter', label: 'A letter', test: (v) => /[a-zA-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /\d/.test(v) },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Both come from the emailed link: /reset-password?token=…&email=…
  const token = params.get('token') || '';
  const email = (params.get('email') || '').toLowerCase();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  const checks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) })),
    [password]
  );

  // Send the person back to sign in shortly after a successful reset, since
  // every existing session for the account has just been revoked.
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => navigate('/login', { replace: true }), 4000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (checks.some((c) => !c.ok)) {
      setFormError('Your new password does not meet the requirements below.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('The two passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await apiClient.post('/auth/reset-password', { email, token, password });
      setDone(true);
      toast.success('Your password has been changed.');
    } catch (error) {
      const message = !error?.response
        ? 'Cannot reach the server. Check your connection and try again.'
        : error?.response?.data?.error || 'Could not reset your password. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // A link that arrived without its parameters cannot be completed; say so
  // rather than showing a form that is guaranteed to fail on submit.
  if (!token || !email) {
    return (
      <AuthShell
        title="This link is incomplete"
        subtitle="The reset link is missing information, which usually means it was clipped by an email client."
      >
        <div className="space-y-4">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Request a new link and open it directly from the email.
            </p>
          </div>
          <Button asChild className="h-11 w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password changed" subtitle="You can sign in with your new password now.">
        <div className="mb-6 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-buy-muted">
            <ShieldCheck className="h-7 w-7 text-buy-muted-foreground" />
          </span>
        </div>
        <p className="mb-5 text-center text-sm text-muted-foreground">
          For safety, every device that was signed in to this account has been signed out.
        </p>
        <Button asChild className="h-11 w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`Setting a new password for ${email}.`}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      }
    >
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
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a new password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError('');
              }}
              disabled={isSubmitting}
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

          {password && (
            <ul className="mt-2 space-y-1">
              {checks.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 text-xs ${
                    c.ok ? 'text-buy-muted-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${c.ok ? 'opacity-100' : 'opacity-30'}`} />
                  {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (formError) setFormError('');
            }}
            disabled={isSubmitting}
            className="h-11"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs font-medium text-destructive">The two passwords do not match.</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full text-base">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              Saving…
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Change password
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
