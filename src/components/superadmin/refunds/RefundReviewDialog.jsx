import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { financialsApi, apiErrorMessage } from '@/lib/financialsApi';
import { formatDate, formatDateTime, toNumber } from '@/lib/format';
import { inr, StatusBadge, LoadingState, ErrorState } from '../financials/shared';

const REVIEWABLE = ['pending', 'failed'];
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

/**
 * Review one refund request: choose the customer's payment, the amount (capped
 * by the server at what Razorpay says is refundable), approve and refund, or
 * reject with a reason. "Check status" re-reads the refund from Razorpay.
 */
export default function RefundReviewDialog({ refundId, canProcess, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [cancelSub, setCancelSub] = useState(true);
  const [mode, setMode] = useState('review'); // review | confirm | reject
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      const d = await financialsApi.refund(refundId);
      setDetail(d);
      const linked = d.charges.find((c) => c.payment_id === d.request.payment_id);
      const first = linked || d.charges.find((c) => c.refundable > 0) || null;
      setPaymentId(first ? first.payment_id : '');
      const requested = toNumber(d.request.requested_amount);
      const refundable = first ? first.refundable : null;
      const start = requested && refundable !== null ? Math.min(requested, refundable) : (refundable ?? requested ?? '');
      setAmount(start === '' || start === null ? '' : String(start));
    } catch (error) {
      setLoadError(apiErrorMessage(error, 'Could not load this refund request.'));
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [refundId]);

  const charge = useMemo(() => detail?.charges.find((c) => c.payment_id === paymentId) || null, [detail, paymentId]);
  const amountNum = AMOUNT_RE.test(amount.trim()) ? Number(amount) : null;
  const amountError = amount.trim() === '' ? 'Enter the amount to refund'
    : amountNum === null || amountNum <= 0 ? 'Enter a positive amount with at most 2 decimals'
      : charge && amountNum > charge.refundable ? `At most ${inr(charge.refundable)} can be refunded on this payment` : null;
  const isFull = charge && amountNum !== null && amountNum === charge.refundable;
  useEffect(() => { setCancelSub(Boolean(isFull)); }, [isFull, paymentId]);

  const request = detail?.request;
  const reviewable = request && REVIEWABLE.includes(request.status);
  // The server finds the payment from its own trail, so "processing" can always be checked.
  const canSync = request && (request.status === 'processing'
    || (request.payment_id && ['processed', 'failed', 'pending'].includes(request.status) && !(request.status === 'processed' && request.settled)));

  const run = async (fn, success) => {
    if (busy) return;
    setBusy(true);
    try {
      const out = await fn();
      toast[out?.pending ? 'warning' : 'success'](out?.message || success);
      onChanged?.();
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'The action failed. Nothing was changed.'));
      await load();
      setMode('review');
    } finally {
      setBusy(false);
    }
  };

  const approve = () => run(() => financialsApi.approveRefund(refundId, {
    payment_id: paymentId || undefined,
    amount: amount.trim(),
    note: note.trim() || undefined,
    cancel_subscription: charge?.subscription_id ? cancelSub : undefined,
  }), 'Refund sent to Razorpay');
  const reject = () => run(() => financialsApi.rejectRefund(refundId, reason.trim()), 'Refund request rejected');
  const sync = () => run(() => financialsApi.syncRefund(refundId), 'Status updated from Razorpay');

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refund request</DialogTitle>
          <DialogDescription>Refunds go back to the customer&apos;s original payment method through Razorpay.</DialogDescription>
        </DialogHeader>

        {!detail && !loadError && <LoadingState label="Loading request…" />}
        {loadError && <ErrorState message={loadError} onRetry={load} />}

        {request && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="text-subtle">Customer</dt><dd className="font-medium">{request.user_name || '—'} <span className="block text-xs text-muted-foreground">{request.user_email}</span></dd></div>
              <div><dt className="text-subtle">Status</dt><dd><StatusBadge status={request.status} />{request.settled && <span className="ml-2 text-xs text-muted-foreground">settled</span>}</dd></div>
              <div><dt className="text-subtle">Requested amount</dt><dd className="font-medium">{inr(request.requested_amount)}</dd></div>
              <div><dt className="text-subtle">Requested on</dt><dd>{formatDateTime(request.created_at)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-subtle">Customer&apos;s reason</dt><dd className="whitespace-pre-wrap">{request.reason || '—'}</dd></div>
              {request.admin_notes && <div className="sm:col-span-2"><dt className="text-subtle">Admin notes</dt><dd className="whitespace-pre-wrap">{request.admin_notes}</dd></div>}
              {request.razorpay_refund_id && <div className="sm:col-span-2"><dt className="text-subtle">Razorpay refund</dt><dd className="font-mono text-xs">{request.razorpay_refund_id}</dd></div>}
            </dl>

            {reviewable && canProcess && mode !== 'reject' && (
              <div className="space-y-4 border-t pt-4">
                {detail.charges.length === 0 ? (
                  <p role="alert" className="text-sm text-hold-muted-foreground bg-hold-muted rounded-lg p-3">
                    This customer has no captured Razorpay payment on record, so it cannot be refunded here. Event tickets and other products paid outside Razorpay must be refunded by the organiser; you can still reject the request.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="refund-payment">Payment to refund</Label>
                      <Select value={paymentId} onValueChange={setPaymentId} disabled={mode === 'confirm'}>
                        <SelectTrigger id="refund-payment"><SelectValue placeholder="Choose a payment" /></SelectTrigger>
                        <SelectContent>
                          {detail.charges.map((c) => (
                            <SelectItem key={c.payment_id} value={c.payment_id} disabled={c.refundable <= 0}>
                              {formatDate(c.date)} · {c.plan_name || 'Plan'} · {inr(c.amount)} ({c.refundable > 0 ? `${inr(c.refundable)} refundable` : 'fully refunded'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {charge && <p className="text-xs text-muted-foreground font-mono">{charge.payment_id}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="refund-amount">Amount (₹)</Label>
                        <Input id="refund-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={mode === 'confirm'} aria-invalid={Boolean(amountError)} aria-describedby="refund-amount-help" />
                        <p id="refund-amount-help" className={`text-xs ${amountError ? 'text-sell' : 'text-muted-foreground'}`}>
                          {amountError || (charge ? `Refundable on this payment: ${inr(charge.refundable)}` : '')}
                        </p>
                      </div>
                      {charge?.subscription_id && (
                        <div className="flex items-start gap-2 pt-6">
                          <Checkbox id="refund-cancel" checked={cancelSub} onCheckedChange={(v) => setCancelSub(v === true)} disabled={mode === 'confirm'} />
                          <Label htmlFor="refund-cancel" className="text-sm font-normal leading-snug">
                            Cancel the subscription now ({charge.subscription_status || 'unknown'})
                          </Label>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="refund-note">Note (saved to the audit log)</Label>
                      <Textarea id="refund-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} disabled={mode === 'confirm'} />
                    </div>
                  </>
                )}
              </div>
            )}

            {reviewable && !canProcess && (
              <p className="text-sm text-muted-foreground border-t pt-4">Only a super admin can approve and send a refund. You can reject the request.</p>
            )}

            {mode === 'reject' && (
              <div className="space-y-1 border-t pt-4">
                <Label htmlFor="refund-reason">Reason for rejecting (sent to the customer)</Label>
                <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} autoFocus />
              </div>
            )}

            {mode === 'confirm' && (
              <div role="alert" className="flex gap-2 text-sm bg-premium-muted text-foreground rounded-lg p-3">
                <AlertTriangle className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <span>Refund <strong>{inr(amountNum)}</strong> on payment <span className="font-mono">{paymentId}</span>{cancelSub && charge?.subscription_id ? ' and cancel the subscription' : ''}? This sends real money back and cannot be undone.</span>
              </div>
            )}

            {detail.history.length > 0 && (
              <details className="text-sm border-t pt-3">
                <summary className="cursor-pointer text-subtle">History ({detail.history.length})</summary>
                <ul className="mt-2 space-y-1">
                  {detail.history.map((h) => (
                    <li key={h.id}><span className="text-muted-foreground">{formatDateTime(h.created_at)}</span> · {h.action}{h.admin_name ? ` · ${h.admin_name}` : ''}{h.amount !== null && h.amount !== undefined ? ` · ${inr(h.amount)}` : ''}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {canSync && canProcess && mode === 'review' && (
            <Button variant="outline" onClick={sync} disabled={busy}>
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" /> Check status
            </Button>
          )}
          {reviewable && mode === 'review' && (
            <Button variant="outline" onClick={() => setMode('reject')} disabled={busy}>Reject</Button>
          )}
          {reviewable && canProcess && mode === 'review' && detail?.charges.length > 0 && (
            <Button onClick={() => setMode('confirm')} disabled={busy || !charge || Boolean(amountError)}>Approve &amp; refund</Button>
          )}
          {mode === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setMode('review')} disabled={busy}>Back</Button>
              <Button onClick={approve} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}Confirm refund</Button>
            </>
          )}
          {mode === 'reject' && (
            <>
              <Button variant="outline" onClick={() => setMode('review')} disabled={busy}>Back</Button>
              <Button variant="destructive" onClick={reject} disabled={busy || reason.trim().length < 3}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}Reject request</Button>
            </>
          )}
          {mode === 'review' && <Button variant="ghost" onClick={onClose} disabled={busy}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

RefundReviewDialog.propTypes = {
  refundId: PropTypes.string.isRequired,
  canProcess: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};
