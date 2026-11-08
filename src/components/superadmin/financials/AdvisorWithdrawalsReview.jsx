import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Wallet, Eye, CheckCircle, XCircle, Banknote, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Advisor } from '@/lib/apiClient';
import { adminWithdrawalsApi, apiErrorMessage } from '@/lib/withdrawalsApi';
import {
  renderWithdrawalStatus, formatInr, formatDateTime, WITHDRAWAL_STATUSES,
} from '@/components/advisors/finance/withdrawalStatus';

const PAGE = 20;

const bankChangeLabel = (flag) => (flag === 'under_24h' ? 'Bank details changed in the last 24 hours' : 'Bank details changed in the last 7 days');
const REFERENCE_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{3,63}$/;

/**
 * Admin review of advisor withdrawals (Financials > Advisor Withdrawals).
 * Owns its data (no props). The server enforces roles and the state machine;
 * the buttons shown here only mirror which transitions are legal.
 * Full account numbers are never in the list or detail. "Reveal bank details"
 * calls an audited endpoint available while a request is approved; the value
 * lives in component state only until the dialog closes.
 */
export default function AdvisorWithdrawalsReview() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [advisors, setAdvisors] = useState([]);
  const [filters, setFilters] = useState({ status: 'pending', advisor_id: '', from: '', to: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState('');

  const [dialog, setDialog] = useState(null); // { type: 'view'|'approve'|'reject'|'paid', row }
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [revealed, setRevealed] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = { limit: PAGE, offset };
      for (const [k, v] of Object.entries(filters)) {
        if (!v) continue;
        // Date inputs give YYYY-MM-DD in the admin's local day. Send absolute
        // instants (ISO with Z) so the server does not guess a timezone; "to"
        // covers the whole local day.
        params[k] = k === 'to'
          ? new Date(`${v}T23:59:59.999`).toISOString()
          : k === 'from' ? new Date(`${v}T00:00:00`).toISOString() : v;
      }
      const data = await adminWithdrawalsApi.list(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setAdminsOnly(false);
    } catch (e) {
      // Sub-admins are signed in but not allowed to review money movements.
      if (e?.response?.status === 403) setAdminsOnly(true);
      else setLoadError(apiErrorMessage(e, 'Could not load withdrawal requests.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    Advisor.list().then((rows) => { if (alive && Array.isArray(rows)) setAdvisors(rows); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const setFilter = (key, value) => { setOffset(0); setFilters((f) => ({ ...f, [key]: value })); };

  const open = (type, row) => {
    setDialog({ type, row });
    setNotes(''); setReason(''); setReference(''); setFormError(''); setRevealed(null);
    setBalance(null); setBalanceError('');
    if (type === 'view' || type === 'approve' || type === 'paid') {
      adminWithdrawalsApi.balance(row.id)
        .then(setBalance)
        .catch((e) => setBalanceError(apiErrorMessage(e, 'Could not load the balance breakdown.')));
    }
  };
  const close = () => { setDialog(null); setRevealed(null); setFormError(''); };

  const run = async (call, successMessage) => {
    setIsSaving(true);
    setFormError('');
    try {
      await call();
      toast.success(successMessage);
      close();
      await load();
    } catch (e) {
      setFormError(apiErrorMessage(e, 'The action failed.'));
      // A 409 means someone else changed it; show fresh data behind the dialog.
      if (e?.response?.status === 409) await load();
    } finally {
      setIsSaving(false);
    }
  };

  const submitApprove = () => run(
    () => adminWithdrawalsApi.approve(dialog.row.id, notes.trim() ? { admin_notes: notes.trim() } : {}),
    'Withdrawal approved'
  );
  const submitReject = () => {
    if (reason.trim().length < 3) { setFormError('Enter a rejection reason (at least 3 characters).'); return; }
    return run(
      () => adminWithdrawalsApi.reject(dialog.row.id, { reason: reason.trim(), ...(notes.trim() ? { admin_notes: notes.trim() } : {}) }),
      'Withdrawal rejected'
    );
  };
  const submitPaid = () => {
    if (!REFERENCE_RE.test(reference.trim())) {
      setFormError('Enter the bank transfer reference (4 to 64 letters, digits or - _ . /).');
      return;
    }
    return run(
      () => adminWithdrawalsApi.markPaid(dialog.row.id, { reference: reference.trim(), ...(notes.trim() ? { admin_notes: notes.trim() } : {}) }),
      'Marked as paid'
    );
  };

  const reveal = async () => {
    setIsRevealing(true);
    setFormError('');
    try {
      setRevealed(await adminWithdrawalsApi.bankDetails(dialog.row.id));
    } catch (e) {
      setFormError(apiErrorMessage(e, 'Could not load bank details.'));
    } finally {
      setIsRevealing(false);
    }
  };

  const row = dialog?.row;
  const notesField = (
    <div className="space-y-1.5">
      <Label htmlFor="wd-admin-notes">Notes (optional, visible to the advisor)</Label>
      <Textarea id="wd-admin-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
    </div>
  );
  const summaryBlock = row && (
    <div className="rounded-md bg-surface-2 p-3 text-sm space-y-1">
      <p><span className="text-subtle">Advisor:</span> <strong>{row.advisor?.display_name || 'Unknown advisor'}</strong></p>
      <p><span className="text-subtle">Amount:</span> <strong>{formatInr(row.amount)}</strong></p>
      {row.bank && <p><span className="text-subtle">Account:</span> {row.bank.bank_name} {row.bank.masked_account_number} · {row.bank.ifsc}</p>}
      {row.bank_change_flag && (
        <p role="status" className="text-hold-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" /> {bankChangeLabel(row.bank_change_flag)}{row.bank_changed_at ? ` (${formatDateTime(row.bank_changed_at)})` : ''}
        </p>
      )}
    </div>
  );
  const balanceBlock = (
    <div className="rounded-md border p-3 text-sm space-y-2" aria-live="polite">
      <p className="font-medium text-foreground">What backs this request</p>
      {!balance && !balanceError && <p className="text-subtle flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading balance…</p>}
      {balanceError && <p role="alert" className="text-sell-muted-foreground">{balanceError}</p>}
      {balance && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-subtle">Approved commissions</span><span className="text-right font-medium">{formatInr(balance.earned)}</span>
            <span className="text-subtle">Open requests (incl. this)</span><span className="text-right">{formatInr(balance.reserved_by_open_requests)}</span>
            <span className="text-subtle">Already paid out</span><span className="text-right">{formatInr(balance.already_paid)}</span>
            <span className="text-subtle">Left after open requests</span><span className="text-right font-medium">{formatInr(balance.available_after_open_requests)}</span>
          </div>
          {!balance.covered && (
            <p role="alert" className="text-sell-muted-foreground">The approved commissions no longer cover the requests made against them. Approving or paying will be refused.</p>
          )}
          {balance.pending_commissions_count > 0 && (
            <p className="text-xs text-subtle">{balance.pending_commissions_count} commission(s) worth {formatInr(balance.pending_commissions_amount)} are still pending approval and do not count.</p>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-subtle">Commission rows counted ({balance.commissions.length}{balance.commissions.length === 50 ? '+' : ''})</summary>
            <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-xs">
              {balance.commissions.length === 0 && <li className="text-subtle">None.</li>}
              {balance.commissions.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="text-subtle">{formatDateTime(c.created_at)}{c.payment_reference ? ` · ${c.payment_reference}` : ''}</span>
                  <span className="font-medium">{formatInr(c.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
  const errorLine = formError && <p role="alert" className="text-sm text-sell-muted-foreground">{formError}</p>;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Advisor Withdrawals</CardTitle>
        <div className="flex flex-wrap items-end gap-3 pt-3">
          <div className="space-y-1">
            <Label htmlFor="wdr-status" className="text-xs">Status</Label>
            <select id="wdr-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">All</option>
              {WITHDRAWAL_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wdr-advisor" className="text-xs">Advisor</Label>
            <select id="wdr-advisor" value={filters.advisor_id} onChange={(e) => setFilter('advisor_id', e.target.value)} className="h-9 max-w-[220px] rounded-md border border-input bg-background px-2 text-sm">
              <option value="">All advisors</option>
              {advisors.map((a) => <option key={a.id} value={a.id}>{a.display_name || a.name || a.id}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wdr-from" className="text-xs">From</Label>
            <Input id="wdr-from" type="date" className="h-9 w-40" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wdr-to" className="text-xs">To</Label>
            <Input id="wdr-to" type="date" className="h-9 w-40" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setOffset(0); setFilters({ status: '', advisor_id: '', from: '', to: '' }); }}>Clear filters</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adminsOnly && (
          <div className="text-center py-10 space-y-2" role="alert">
            <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-semibold text-foreground">Admins only</p>
            <p className="text-subtle">Reviewing advisor withdrawals needs an admin or super admin account. Ask an admin if you need access.</p>
          </div>
        )}

        {!adminsOnly && isLoading && (
          <div className="flex justify-center py-10" role="status" aria-label="Loading withdrawals"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}

        {!adminsOnly && !isLoading && loadError && (
          <div className="text-center py-8 space-y-3">
            <AlertTriangle className="w-10 h-10 text-sell-muted-foreground mx-auto" />
            <p className="text-subtle">{loadError}</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </div>
        )}

        {!adminsOnly && !isLoading && !loadError && items.length === 0 && (
          <p className="text-center text-subtle py-10">No withdrawal requests match these filters.</p>
        )}

        {!adminsOnly && !isLoading && !loadError && items.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">{w.advisor?.display_name || 'Unknown advisor'} · {formatInr(w.amount)}</p>
              <p className="text-xs text-subtle">Requested {formatDateTime(w.created_at)}{w.bank ? ` · ${w.bank.bank_name} ${w.bank.masked_account_number}` : ''}</p>
              {w.reference_number && <p className="text-xs text-subtle">Ref {w.reference_number}</p>}
              {w.bank_change_flag && (
                <p className="text-xs text-hold-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {bankChangeLabel(w.bank_change_flag)}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderWithdrawalStatus(w.status)}
              <Button size="sm" variant="outline" onClick={() => open('view', w)}><Eye className="w-4 h-4 mr-1" />Details</Button>
              {w.status === 'pending' && (
                <Button size="sm" className="bg-buy text-buy-foreground hover:bg-buy-soft" onClick={() => open('approve', w)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
              )}
              {w.status === 'approved' && (
                <Button size="sm" className="bg-buy text-buy-foreground hover:bg-buy-soft" onClick={() => open('paid', w)}><Banknote className="w-4 h-4 mr-1" />Mark paid</Button>
              )}
              {(w.status === 'pending' || w.status === 'approved') && (
                <Button size="sm" variant="outline" onClick={() => open('reject', w)}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
              )}
            </div>
          </div>
        ))}

        {!adminsOnly && total > PAGE && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || isLoading} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
            <span className="text-sm text-subtle">{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
            <Button variant="outline" size="sm" disabled={offset + PAGE >= total || isLoading} onClick={() => setOffset(offset + PAGE)}>Next</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o && !isSaving) close(); }}>
        <DialogContent>
          {dialog?.type === 'view' && row && (
            <>
              <DialogHeader>
                <DialogTitle>Withdrawal details</DialogTitle>
                <DialogDescription>Bank details are masked. Reveal the full account number only when you are about to make the transfer; each reveal is logged.</DialogDescription>
              </DialogHeader>
              {summaryBlock}
              {balanceBlock}
              <div className="text-sm space-y-1">
                <p>Status: {renderWithdrawalStatus(row.status)}</p>
                <p className="text-subtle">Requested {formatDateTime(row.created_at)}</p>
                {row.approved_at && <p className="text-subtle">Approved {formatDateTime(row.approved_at)}</p>}
                {row.paid_at && <p className="text-subtle">Paid {formatDateTime(row.paid_at)}{row.reference_number ? ` · Ref ${row.reference_number}` : ''}</p>}
                {row.rejection_reason && <p className="text-sell-muted-foreground">Rejected: {row.rejection_reason}</p>}
                {row.admin_notes && <p className="text-subtle">Notes: {row.admin_notes}</p>}
              </div>
              {row.status === 'approved' && !revealed && (
                <Button variant="outline" onClick={reveal} disabled={isRevealing}>
                  {isRevealing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                  Reveal bank details (logged)
                </Button>
              )}
              {revealed && (
                <div className="rounded-md border border-hold p-3 text-sm space-y-1" aria-live="polite">
                  <p><span className="text-subtle">Holder:</span> {revealed.account_holder_name}</p>
                  <p><span className="text-subtle">Bank:</span> {revealed.bank_name} ({revealed.account_type})</p>
                  <p><span className="text-subtle">Account number:</span> <span className="font-mono">{revealed.account_number}</span></p>
                  <p><span className="text-subtle">IFSC:</span> <span className="font-mono">{revealed.ifsc}</span></p>
                </div>
              )}
              {errorLine}
              <DialogFooter><Button variant="outline" onClick={close}>Close</Button></DialogFooter>
            </>
          )}

          {dialog?.type === 'approve' && row && (
            <>
              <DialogHeader>
                <DialogTitle>Approve withdrawal</DialogTitle>
                <DialogDescription>The advisor is notified. You can mark it paid after making the bank transfer.</DialogDescription>
              </DialogHeader>
              {summaryBlock}
              {balanceBlock}
              {notesField}
              {errorLine}
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={isSaving}>Cancel</Button>
                <Button onClick={submitApprove} disabled={isSaving} className="bg-buy text-buy-foreground hover:bg-buy-soft">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Approve
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog?.type === 'reject' && row && (
            <>
              <DialogHeader>
                <DialogTitle>Reject withdrawal</DialogTitle>
                <DialogDescription>The reason is shown to the advisor.</DialogDescription>
              </DialogHeader>
              {summaryBlock}
              <div className="space-y-1.5">
                <Label htmlFor="wd-reject-reason">Reason (required)</Label>
                <Textarea id="wd-reject-reason" value={reason} maxLength={500} onChange={(e) => { setReason(e.target.value); setFormError(''); }} />
              </div>
              {notesField}
              {errorLine}
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={isSaving}>Cancel</Button>
                <Button variant="destructive" onClick={submitReject} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Reject
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog?.type === 'paid' && row && (
            <>
              <DialogHeader>
                <DialogTitle>Mark as paid</DialogTitle>
                <DialogDescription>Confirm only after the transfer has been made. Open Details to reveal the account number for the transfer.</DialogDescription>
              </DialogHeader>
              {summaryBlock}
              {balanceBlock}
              <div className="space-y-1.5">
                <Label htmlFor="wd-paid-ref">Bank transfer reference / UTR (required)</Label>
                <Input id="wd-paid-ref" value={reference} maxLength={64} autoComplete="off" onChange={(e) => { setReference(e.target.value); setFormError(''); }} />
              </div>
              {notesField}
              {errorLine}
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={isSaving}>Cancel</Button>
                <Button onClick={submitPaid} disabled={isSaving} className="bg-buy text-buy-foreground hover:bg-buy-soft">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Mark paid
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
