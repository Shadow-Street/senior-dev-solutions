import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, EyeOff, Sparkles, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { pollTitle } from './pollAdminModel';

/** Actions that need no extra input. Returns the success message. */
export async function runDirectAction(type, poll) {
  const title = pollTitle(poll);
  switch (type) {
    case 'close': await pollAdminApi.action(poll.id, 'close'); return `Voting closed on "${title}"`;
    case 'reopen': await pollAdminApi.action(poll.id, 'reopen'); return `"${title}" reopened`;
    case 'unhide': await pollAdminApi.action(poll.id, 'unhide'); return `"${title}" is visible again`;
    case 'unfeature': await pollAdminApi.action(poll.id, 'unfeature'); return `"${title}" is no longer featured`;
    case 'premium': await pollAdminApi.update(poll.id, { is_premium: true }); return `"${title}" is now premium-only`;
    case 'general': await pollAdminApi.update(poll.id, { is_premium: false }); return `"${title}" is now open to everyone`;
    default: throw new Error(`Unknown action ${type}`);
  }
}

const hasEnded = (poll) => Boolean(poll?.expires_at) && new Date(poll.expires_at) <= new Date();

/** True when the action needs a dialog (reason, duration, new end time, confirmation). */
export const needsDialog = (type, poll) =>
  type === 'hide' || type === 'feature' || type === 'delete' || (type === 'reopen' && hasEnded(poll));

const CONFIG = {
  hide: { icon: EyeOff, heading: 'Hide poll', action: 'Hide poll', destructive: true,
    text: () => 'Members will see this poll as suspended and can no longer vote. You can restore it later.' },
  feature: { icon: Sparkles, heading: 'Feature poll', action: 'Feature',
    text: () => 'Featured polls are highlighted to members. Featuring stops automatically when the poll ends.' },
  reopen: { icon: Unlock, heading: 'Reopen poll', action: 'Reopen',
    text: () => 'This poll has already ended. Set a new end time to reopen voting.' },
  delete: { icon: AlertTriangle, heading: 'Delete poll permanently?', action: 'Delete poll and votes', destructive: true,
    text: (poll) => `This permanently deletes the poll and all ${poll?.total_votes ?? 0} of its votes. This cannot be undone. Consider hiding it instead.` },
};

/**
 * Poll moderation actions for Poll Management.
 *
 *   const actions = usePollActions({ onDone });
 *   actions.run('hide', poll);   // opens a dialog, or runs straight away
 *   {actions.dialog}             // render once
 *
 * Simple actions (close, unhide, unfeature, premium/general, reopen of a poll
 * that has not ended) run immediately. These need input or confirmation:
 *   hide     reason is required and lands in the audit log
 *   feature  1-30 days (never past the poll's end)
 *   reopen   an ended poll needs a new end time, or none
 *   delete   permanent; removes the poll and its votes
 * onDone(message, { deleted }) runs after every successful change.
 */
export function usePollActions({ onDone }) {
  const [pending, setPending] = useState(null); // { type, poll }
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [endsAt, setEndsAt] = useState('');
  const [noEnd, setNoEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReason('');
    setDays('7');
    setEndsAt('');
    setNoEnd(false);
    setError('');
  }, [pending]);

  const run = async (type, poll) => {
    if (needsDialog(type, poll)) {
      setPending({ type, poll });
      return;
    }
    try {
      onDone(await runDirectAction(type, poll), {});
    } catch (err) {
      toast.error(errorMessage(err, 'That did not work. Please try again.'));
    }
  };

  const close = () => { if (!busy) setPending(null); };

  const submit = async (e) => {
    e.preventDefault();
    const { type, poll } = pending;
    const title = pollTitle(poll);
    setError('');
    setBusy(true);
    try {
      if (type === 'hide') {
        if (reason.trim().length < 3) { setError('Please give a reason (at least 3 characters).'); return; }
        await pollAdminApi.action(poll.id, 'hide', { reason: reason.trim() });
        onDone(`"${title}" is hidden from members`, {});
      } else if (type === 'feature') {
        await pollAdminApi.action(poll.id, 'feature', { days: Number(days) });
        onDone(`"${title}" is featured`, {});
      } else if (type === 'reopen') {
        if (!noEnd && !endsAt) { setError('Choose a new end time, or tick "No end time".'); return; }
        await pollAdminApi.action(poll.id, 'reopen', { expires_at: noEnd ? null : new Date(endsAt).toISOString() });
        onDone(`"${title}" reopened`, {});
      } else if (type === 'delete') {
        const res = await pollAdminApi.remove(poll.id);
        onDone(`"${title}" deleted with ${res.deleted_votes} vote${res.deleted_votes === 1 ? '' : 's'}`, { deleted: true });
      }
      setPending(null);
    } catch (err) {
      setError(errorMessage(err, 'That did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const config = pending ? CONFIG[pending.type] : null;
  const Icon = config?.icon;

  const dialog = config && (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${config.destructive ? 'text-sell' : 'text-primary'}`} aria-hidden="true" />
              {config.heading}
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{`"${pollTitle(pending.poll)}"`}</span>. {config.text(pending.poll)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {pending.type === 'hide' && (
              <div className="space-y-2">
                <Label htmlFor="hide-reason">Reason (recorded in the audit log)</Label>
                <Textarea id="hide-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3}
                  placeholder="e.g. Misleading tip / spam / inappropriate language" autoFocus />
              </div>
            )}
            {pending.type === 'feature' && (
              <div className="space-y-2">
                <Label htmlFor="feature-days">Feature for</Label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger id="feature-days"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1', '3', '7', '14', '30'].map((d) => <SelectItem key={d} value={d}>{d} day{d === '1' ? '' : 's'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {pending.type === 'reopen' && (
              <div className="space-y-2">
                <Label htmlFor="reopen-ends">New end time</Label>
                <Input id="reopen-ends" type="datetime-local" value={endsAt} disabled={noEnd} onChange={(e) => setEndsAt(e.target.value)} />
                <label className="flex items-center gap-2 text-sm text-subtle">
                  <input type="checkbox" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="accent-primary" />
                  No end time
                </label>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-sell-muted-foreground">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className={config.destructive ? 'bg-sell text-sell-foreground hover:bg-sell/90' : ''}>
              {busy ? 'Working...' : config.action}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { run, dialog };
}
