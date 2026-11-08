import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, Clock, TrendingUp, CheckCircle, Loader2, AlertTriangle, Landmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { withdrawalsApi, bankAccountsApi, apiErrorMessage } from '@/lib/withdrawalsApi';
import { validateWithdrawalAmount } from '@/lib/bankValidation';
import { renderWithdrawalStatus, formatInr, formatDateTime, WITHDRAWAL_STATUSES } from './withdrawalStatus';

const PAGE = 10;

/**
 * Advisor withdrawals: balance, request form, status history, cancel.
 * Owns its data (no props). "Available" is computed by the server from
 * approved commissions minus open and paid withdrawals; this component only
 * displays it and pre-validates the amount for convenience.
 */
export default function AdvisorWithdrawals() {
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amountError, setAmountError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = { limit: PAGE, offset };
      if (statusFilter) params.status = statusFilter;
      const [s, a, w] = await Promise.all([
        withdrawalsApi.summary(),
        bankAccountsApi.list(),
        withdrawalsApi.list(params),
      ]);
      setSummary(s);
      setAccounts(a);
      setItems(w.items || []);
      setTotal(w.total || 0);
      setAccountId((cur) => {
        const ok = a.filter((x) => x.status === 'active' && !x.cooling_off);
        return ok.some((x) => x.id === cur) ? cur : (ok.find((x) => x.is_primary) || ok[0] || {}).id || '';
      });
    } catch (e) {
      setLoadError(apiErrorMessage(e, 'Could not load your withdrawals.'));
    } finally {
      setIsLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const usable = accounts.filter((a) => a.status === 'active');
  const ready = usable.filter((a) => !a.cooling_off);
  const earliestHold = usable.filter((a) => a.cooling_off).map((a) => new Date(a.usable_from).getTime()).sort((x, y) => x - y)[0];
  const hasOpen = Boolean(summary?.has_open_request);
  const approved = summary?.advisor_status ? summary.advisor_status === 'approved' : true;
  const blocker = !approved
    ? 'Your advisor profile must be approved before you can withdraw.'
    : usable.length === 0
      ? 'Add a bank account in the Bank Accounts tab before requesting a withdrawal.'
      : ready.length === 0
        ? `Your bank account was added or changed recently. For your security it can receive withdrawals from ${formatDateTime(earliestHold)}.`
      : hasOpen
        ? 'You already have a withdrawal in progress. You can request another once it is paid, rejected or cancelled.'
        : (summary?.available || 0) <= 0
          ? 'You have no available balance to withdraw.'
          : '';

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const err = validateWithdrawalAmount(amount, summary?.available);
    setAmountError(err);
    if (err) return;
    setIsSubmitting(true);
    try {
      await withdrawalsApi.create({ amount: amount.trim(), bank_account_id: accountId || undefined });
      toast.success('Withdrawal request submitted');
      setAmount('');
      setOffset(0);
      await load();
    } catch (ex) {
      setSubmitError(apiErrorMessage(ex, 'Could not submit the withdrawal request.'));
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    setIsCancelling(true);
    try {
      await withdrawalsApi.cancel(cancelling.id);
      toast.success('Withdrawal cancelled');
      setCancelling(null);
      await load();
    } catch (ex) {
      toast.error(apiErrorMessage(ex, 'Could not cancel this request.'));
      setCancelling(null);
      await load();
    } finally {
      setIsCancelling(false);
    }
  };

  const statCard = (icon, label, value) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          {icon}
          <div className="ml-4">
            <p className="text-sm font-medium text-subtle">{label}</p>
            <p className="text-2xl font-bold text-foreground">{formatInr(value)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading withdrawals">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError && !summary) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-sell-muted-foreground mx-auto" />
          <p className="text-subtle">{loadError}</p>
          <Button variant="outline" onClick={load}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Withdrawals</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCard(<Wallet className="w-8 h-8 text-buy-muted-foreground" />, 'Available balance', summary?.available)}
        {statCard(<Clock className="w-8 h-8 text-hold-muted-foreground" />, 'In review / approved', summary?.pending_withdrawals)}
        {statCard(<CheckCircle className="w-8 h-8 text-buy-muted-foreground" />, 'Total withdrawn', summary?.total_withdrawn)}
        {statCard(<TrendingUp className="w-8 h-8 text-primary" />, 'Total earned', summary?.earned)}
      </div>
      <p className="text-xs text-muted-foreground">
        Available balance = approved commission earnings, minus withdrawals that are pending, approved or paid.
      </p>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Request a withdrawal</h3>
          {blocker && (
            <p className="mb-4 rounded-md bg-hold-muted p-3 text-sm text-hold-muted-foreground" role="status">{blocker}</p>
          )}
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3 items-start" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="wd-amount">Amount (₹)</Label>
              <Input
                id="wd-amount" inputMode="decimal" placeholder="0.00" autoComplete="off" value={amount}
                aria-invalid={Boolean(amountError)} disabled={Boolean(blocker) || isSubmitting}
                onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
              />
              {amountError && <p role="alert" className="text-sm text-sell-muted-foreground">{amountError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wd-account">Pay to</Label>
              <select
                id="wd-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}
                disabled={Boolean(blocker) || isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {usable.length === 0 && <option value="">No bank account</option>}
                {usable.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.cooling_off}>
                    {a.bank_name} {a.masked_account_number}{a.is_primary ? ' (primary)' : ''}{a.cooling_off ? ` - on hold until ${formatDateTime(a.usable_from)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:pt-6">
              <Button type="submit" disabled={Boolean(blocker) || isSubmitting} className="bg-buy text-buy-foreground hover:bg-buy-soft w-full">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                Request withdrawal
              </Button>
            </div>
          </form>
          {submitError && <p role="alert" className="mt-3 text-sm text-sell-muted-foreground">{submitError}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">History</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="wd-filter" className="text-sm text-subtle">Status</Label>
            <select
              id="wd-filter" value={statusFilter}
              onChange={(e) => { setOffset(0); setStatusFilter(e.target.value); }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All</option>
              {WITHDRAWAL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {loadError && <p role="alert" className="text-sm text-sell-muted-foreground">{loadError} <Button variant="link" className="p-0 h-auto" onClick={load}>Retry</Button></p>}

        {items.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-subtle">{statusFilter ? 'No withdrawals with this status.' : 'No withdrawal requests yet.'}</p>
            </CardContent>
          </Card>
        )}

        {items.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{formatInr(w.amount)}</p>
                  <p className="text-sm text-subtle">Requested {formatDateTime(w.created_at)}</p>
                  {w.bank && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Landmark className="w-3 h-3" /> {w.bank.bank_name} {w.bank.masked_account_number}
                    </p>
                  )}
                </div>
                {renderWithdrawalStatus(w.status)}
              </div>
              <div className="text-xs text-subtle space-y-0.5">
                {w.approved_at && <p>Approved {formatDateTime(w.approved_at)}</p>}
                {w.paid_at && <p>Paid {formatDateTime(w.paid_at)}{w.reference_number ? ` · Ref ${w.reference_number}` : ''}</p>}
                {w.rejected_at && <p>Rejected {formatDateTime(w.rejected_at)}</p>}
                {w.cancelled_at && <p>Cancelled {formatDateTime(w.cancelled_at)}</p>}
              </div>
              {w.rejection_reason && <p className="text-sm text-sell-muted-foreground">Reason: {w.rejection_reason}</p>}
              {w.admin_notes && <p className="text-sm text-subtle">Note from admin: {w.admin_notes}</p>}
              {w.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => setCancelling(w)}>Cancel request</Button>
              )}
            </CardContent>
          </Card>
        ))}

        {total > PAGE && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={offset === 0 || isLoading} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
            <span className="text-sm text-subtle">{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
            <Button variant="outline" size="sm" disabled={offset + PAGE >= total || isLoading} onClick={() => setOffset(offset + PAGE)}>Next</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={cancelling !== null}
        onClose={() => { if (!isCancelling) setCancelling(null); }}
        onConfirm={confirmCancel}
        variant="destructive"
        title="Cancel this withdrawal?"
        message={cancelling ? `Your request for ${formatInr(cancelling.amount)} will be cancelled and the amount returned to your available balance.` : ''}
        confirmText={isCancelling ? 'Cancelling…' : 'Cancel request'}
        cancelText="Keep request"
      />
    </div>
  );
}
