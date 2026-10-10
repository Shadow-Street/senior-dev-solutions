import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, Loader2, MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from '@/components/auth/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();

    if (!value) {
      setFormError('Enter the email address for your account.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFormError('That email address does not look right.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await apiClient.post('/auth/forgot-password', { email: value });
      /**
       * The same confirmation shows whether or not the address is registered.
       *
       * The server answers identically for both cases on purpose: telling the
       * visitor "no such account" would turn this form into a membership
       * oracle — paste a list of addresses, learn which hold accounts on a
       * financial platform. The screen must not undo that by being more
       * specific than the API.
       */
      setSent(true);
    } catch (error) {
      const message = !error?.response
        ? 'Cannot reach the server. Check your connection and try again.'
        : error?.response?.data?.error || 'Could not send the reset link. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="If an account exists for that address, a reset link is on its way."
      >
        <div className="mb-6 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-premium-muted">
            <MailCheck className="h-7 w-7 text-primary" />
          </span>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            The link works once and expires in 30 minutes. If nothing arrives within a few
            minutes, check your spam folder.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setSent(false);
              setFormError('');
            }}
          >
            Use a different address
          </Button>
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 pt-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (formError) setFormError('');
            }}
            disabled={isSubmitting}
            className="h-11"
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full text-base">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send reset link
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
