import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/components/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2, MailCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

/** Rules shown live, so nothing is rejected only after pressing the button. */
const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'letter', label: 'A letter', test: (v) => /[a-zA-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /\d/.test(v) },
];

const OTP_LENGTH = 6;

export default function Register() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();

  // 'details' collects the account; 'verify' confirms the emailed code.
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && user) navigate('/Dashboard', { replace: true });
  }, [authLoading, user, navigate]);

  // Countdown on the resend button, so the server is not hammered and the
  // person can see when another code is available.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'verify') codeInputRef.current?.focus();
  }, [step]);

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const passwordChecks = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(form.password) }));

  const validateDetails = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email || !form.password || !form.confirmPassword) {
      return 'Fill in every field to continue.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email address does not look right.';
    if (passwordChecks.some((c) => !c.ok)) return 'Your password does not meet the requirements below.';
    if (form.password !== form.confirmPassword) return 'The two passwords do not match.';
    return '';
  };

  const handleDetails = async (e) => {
    e.preventDefault();
    const problem = validateDetails();
    if (problem) {
      setFormError(problem);
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      /**
       * Registration no longer returns a session. The account is created
       * unverified and a code is emailed; the session is issued once that
       * code comes back, so the confirmation step cannot be skipped.
       */
      await apiClient.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setStep('verify');
      setResendIn(45);
      toast.success('We sent a 6-digit code to your email.');
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        (!error?.response
          ? 'Cannot reach the server. Check your connection and try again.'
          : 'Could not create your account. Please try again.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== OTP_LENGTH) {
      setFormError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const { data } = await apiClient.post('/auth/verify-otp', {
        email: form.email.trim().toLowerCase(),
        code,
      });
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      }
      // Let the context adopt the new session before leaving the page.
      await refreshUser();
      toast.success('Your account is ready.');
      navigate('/Dashboard', { replace: true });
    } catch (error) {
      const message = error?.response?.data?.error || 'That code is not correct.';
      setFormError(message);
      toast.error(message);
      setCode('');
      codeInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setFormError('');
    try {
      await apiClient.post('/auth/resend-otp', { email: form.email.trim().toLowerCase() });
      setResendIn(45);
      toast.success('A new code is on its way.');
    } catch {
      toast.error('Could not send a new code. Try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  // --- Verification step ----------------------------------------------------
  if (step === 'verify') {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a ${OTP_LENGTH}-digit code to ${form.email.trim()}.`}
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

        <div className="mb-6 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-premium-muted">
            <MailCheck className="h-7 w-7 text-primary" />
          </span>
        </div>

        <form onSubmit={handleVerify} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              ref={codeInputRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              placeholder="000000"
              value={code}
              // Digits only, so a pasted code with spaces or dashes still works.
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                if (formError) setFormError('');
              }}
              disabled={isSubmitting}
              className="h-14 text-center text-2xl font-bold tracking-[0.5em] tabular-nums"
            />
            <p className="text-xs text-muted-foreground">The code expires in 10 minutes.</p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || code.length !== OTP_LENGTH}
            className="h-11 w-full text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                Verifying…
              </>
            ) : (
              'Verify and continue'
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || resendIn > 0}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {resendIn > 0 ? `Send a new code in ${resendIn}s` : isResending ? 'Sending…' : 'Send a new code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('details');
              setCode('');
              setFormError('');
            }}
            className="flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  // --- Details step ---------------------------------------------------------
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the Protocall investor community."
      footer={
        <span className="text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
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

      <form onSubmit={handleDetails} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={form.name}
            onChange={update}
            disabled={isSubmitting}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update}
            disabled={isSubmitting}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
              value={form.password}
              onChange={update}
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

          {form.password && (
            <ul className="mt-2 space-y-1">
              {passwordChecks.map((c) => (
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
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={update}
            disabled={isSubmitting}
            className="h-11"
          />
          {form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="text-xs font-medium text-destructive">The two passwords do not match.</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full text-base">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              Creating your account…
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
