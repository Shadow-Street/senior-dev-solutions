import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, Ban, CheckCircle, ExternalLink, Loader2, MessageSquareWarning, ShieldAlert, Trash2, UserX, XCircle, ArrowUpCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPageUrl } from '@/utils';
import { moderationApi, moderationErrorMessage } from '@/lib/moderationApi';
import {
  ACTION_LABELS, REASON_LABELS, SANCTION_LABELS, SEVERITY_STYLES, STATUS_STYLES, TARGET_LABELS, decisionLabel, formatDateTime,
} from './constants';
import { DESTRUCTIVE, NEEDS_REASON, SANCTIONS, decisionSchema } from './decisionSchema';

const ACTION_BUTTONS = [
  { action: 'approve', label: 'Approve', hint: 'Content is fine; dismiss the report', icon: CheckCircle },
  { action: 'reject', label: 'Reject report', hint: 'The report is invalid', icon: XCircle },
  { action: 'escalate', label: 'Escalate', hint: 'Needs a senior decision', icon: ArrowUpCircle },
  { action: 'remove_content', label: 'Remove content', hint: 'Hide it and notify the author', icon: Trash2, removable: true },
  { action: 'warn', label: 'Warn user', hint: 'Send the author a warning', icon: MessageSquareWarning, sanction: true },
  { action: 'suspend', label: 'Suspend user', hint: '1 to 365 days', icon: UserX, sanction: true },
  { action: 'ban', label: 'Block user', hint: 'Permanent block', icon: Ban, sanction: true },
];

const CONFIRM_COPY = {
  remove_content: 'The content will be hidden from everyone and the author will be told why.',
  suspend: 'The user will be signed out everywhere and cannot sign in until the suspension ends.',
  ban: 'The user will be signed out everywhere and blocked permanently until an admin reactivates the account.',
};

function contextLink(report) {
  const ctx = report.context || {};
  if ((report.target_type === 'message' || report.target_type === 'blocked_message') && ctx.chat_room_id) {
    return { to: createPageUrl(`ChatRooms?roomId=${encodeURIComponent(ctx.chat_room_id)}`), label: report.room?.name ? `Open room: ${report.room.name}` : 'Open chat room' };
  }
  if (report.target_type === 'advisor_post' && ctx.advisor_id) {
    return { to: createPageUrl(`AdvisorProfile?id=${encodeURIComponent(ctx.advisor_id)}`), label: 'Open advisor profile' };
  }
  return null;
}

function renderSection(title, children) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </section>
  );
}

const ReviewContext = createContext({ reportId: null, onClose: () => {}, onDecided: () => {} });

function ReviewPanel() {
  const { reportId, onClose, onDecided } = useContext(ReviewContext);
  const open = Boolean(reportId);
  const onOpenChange = (next) => { if (!next) onClose(); };
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(null); // values awaiting confirmation

  const {
    register, handleSubmit, watch, setValue, reset, formState: { errors },
  } = useForm({ resolver: zodResolver(decisionSchema), defaultValues: { action: undefined, reason: '', days: '7', alsoRemove: false } });
  const action = watch('action');

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await moderationApi.get(reportId));
    } catch (e) {
      setLoadError(moderationErrorMessage(e, 'Could not load this report.'));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (open) {
      reset({ action: undefined, reason: '', days: '7', alsoRemove: false });
      setDetail(null);
      load();
    }
  }, [open, load, reset]);

  const report = detail?.report;
  const isOpen = report && ['pending', 'escalated'].includes(report.status);
  const removable = report && ['message', 'advisor_post'].includes(report.target_type) && !detail?.target?.removed;
  const hasAuthor = Boolean(report?.target_user_id);

  const submit = async (values) => {
    setSubmitting(true);
    try {
      const result = await moderationApi.decide(report.id, {
        action: values.action,
        reason: values.reason?.trim() || undefined,
        days: values.action === 'suspend' ? Number(values.days) : undefined,
        alsoRemove: SANCTIONS.includes(values.action) && removable && values.alsoRemove,
      });
      toast.success(`${ACTION_LABELS[values.action]}.`);
      onDecided?.(result);
      onOpenChange(false);
    } catch (e) {
      toast.error(moderationErrorMessage(e, 'Could not apply this action.'));
      if (e?.response?.status === 409) load();
    } finally {
      setSubmitting(false);
      setPending(null);
    }
  };

  const onValid = (values) => {
    if (DESTRUCTIVE.includes(values.action)) setPending(values);
    else submit(values);
  };

  const severity = report && (SEVERITY_STYLES[report.severity] || SEVERITY_STYLES.medium);
  const status = report && (STATUS_STYLES[report.status] || STATUS_STYLES.pending);
  const label = decisionLabel(report);
  const link = report && contextLink(report);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" aria-hidden="true" />
              Review report
            </DialogTitle>
            <DialogDescription>Check the reported content and the author&apos;s history, then decide.</DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground" role="status">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading report...
            </div>
          )}
          {loadError && !loading && (
            <div className="rounded-lg bg-sell-muted text-sell-muted-foreground p-4 text-sm" role="alert">
              {loadError} <Button variant="link" className="px-1" onClick={load}>Try again</Button>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{REASON_LABELS[report.reason] || report.reason}</span>
                <Badge className={`${severity.className} border-0`}>{severity.label}</Badge>
                <Badge className={`${status.className} border-0`}>{status.label}</Badge>
                <Badge variant="outline">{TARGET_LABELS[report.target_type] || report.target_type}</Badge>
                {label && <span className="text-xs text-muted-foreground">Action: <span className="font-medium">{label}</span></span>}
              </div>

              {renderSection('Reported content', (<>
                {report.target_type === 'user' ? (
                  <p className="text-sm text-subtle">The member reported this user&apos;s profile or behaviour.</p>
                ) : (
                  <div className="bg-surface-2 rounded-lg p-3 border-l-4 border-sell">
                    {/* Rendered as text: React escapes it, nothing is parsed as HTML. */}
                    <p className="text-sm whitespace-pre-wrap break-words" data-testid="report-snapshot">{report.content_snapshot || '(no text)'}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Reported {formatDateTime(report.created_at)}</span>
                  {detail.target?.removed && <span className="text-sell-muted-foreground font-medium">Already removed</span>}
                  {link && (
                    <Link to={link.to} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      {link.label} <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </>))}

              <div className="grid gap-4 md:grid-cols-2">
                {renderSection('Reported by', (<>
                  {report.source === 'auto' ? (
                    <p className="text-sm text-subtle">The chat filter blocked this message before it was sent.</p>
                  ) : (
                    <div className="text-sm">
                      <p className="font-medium">{report.reporter?.name || 'Unknown member'}</p>
                      {report.reporter?.email && <p className="text-muted-foreground">{report.reporter.email}</p>}
                      {report.note && <p className="mt-2 whitespace-pre-wrap break-words bg-surface-2 rounded p-2">{report.note}</p>}
                    </div>
                  )}
                </>))}
                {renderSection('Author', (<>
                  {report.target_user ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{report.target_user.name}</p>
                      {report.target_user.email && <p className="text-muted-foreground">{report.target_user.email}</p>}
                      <p className="text-xs text-muted-foreground">Role: {report.target_user.role || 'user'} · Account: {report.target_user.status || 'unknown'}</p>
                      <p className="text-xs">
                        <span className={detail.author.warnings > 0 ? 'font-semibold text-sell-muted-foreground' : 'text-muted-foreground'}>
                          {detail.author.warnings} prior warning{detail.author.warnings === 1 ? '' : 's'}
                        </span>
                        {' · '}
                        <span className="text-muted-foreground">{detail.author.reports.length} other report{detail.author.reports.length === 1 ? '' : 's'}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-subtle">Author not found.</p>
                  )}
                </>))}
              </div>

              {renderSection('Warnings and sanctions history', (<>
                {detail.author.sanctions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous warnings or sanctions.</p>
                ) : (
                  <ul className="text-sm divide-y border rounded-lg">
                    {detail.author.sanctions.map((s) => (
                      <li key={s.id} className="p-2 flex flex-wrap gap-2 justify-between">
                        <span><span className="font-medium">{SANCTION_LABELS[s.action] || s.action}</span>{s.reason ? `: ${s.reason}` : ''}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}{s.actor?.name ? ` by ${s.actor.name}` : ''}{s.ends_at ? ` · until ${formatDateTime(s.ends_at)}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>))}

              {detail.actions.length > 0 && renderSection('Decisions on this report', (<>
                  <ul className="text-sm divide-y border rounded-lg">
                    {detail.actions.map((a) => (
                      <li key={a.id || a.created_at} className="p-2 flex flex-wrap gap-2 justify-between">
                        <span><span className="font-medium">{ACTION_LABELS[a.action] || a.action}</span>{a.note ? `: ${a.note}` : ''}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}{a.moderator?.name ? ` by ${a.moderator.name}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </>))}

              {isOpen ? (
                <form onSubmit={handleSubmit(onValid)} className="space-y-4 border-t pt-4" aria-label="Decision">
                  <fieldset>
                    <legend className="text-sm font-semibold mb-2">Decision</legend>
                    <input type="hidden" {...register('action')} />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {ACTION_BUTTONS.filter((b) => (!b.removable || removable || report.target_type === 'blocked_message') && (!b.sanction || hasAuthor))
                        .filter((b) => !(b.action === 'escalate' && report.status === 'escalated'))
                        .map((b) => {
                          const Icon = b.icon;
                          const selected = action === b.action;
                          return (
                            <button
                              key={b.action}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setValue('action', b.action, { shouldValidate: false })}
                              className={`text-left rounded-lg border p-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-primary bg-premium-muted text-primary' : 'border-border hover:bg-surface-2'}`}
                            >
                              <span className="flex items-center gap-1 font-medium"><Icon className="w-4 h-4" aria-hidden="true" />{b.label}</span>
                              <span className="block text-xs text-muted-foreground">{b.hint}</span>
                            </button>
                          );
                        })}
                    </div>
                    {errors.action && <p className="text-xs text-sell-muted-foreground mt-1" role="alert">Choose a decision.</p>}
                  </fieldset>

                  {action && (
                    <>
                      <div>
                        <Label htmlFor="moderation-reason">
                          {NEEDS_REASON.includes(action) ? 'Reason (shown to the user)' : 'Note (optional)'}
                        </Label>
                        <Textarea id="moderation-reason" rows={3} className="mt-1" {...register('reason')} aria-invalid={Boolean(errors.reason)} />
                        {errors.reason && <p className="text-xs text-sell-muted-foreground mt-1" role="alert">{errors.reason.message}</p>}
                      </div>
                      {action === 'suspend' && (
                        <div className="max-w-[12rem]">
                          <Label htmlFor="moderation-days">Suspension length (days)</Label>
                          <Input id="moderation-days" type="number" min={1} max={365} className="mt-1" {...register('days')} aria-invalid={Boolean(errors.days)} />
                          {errors.days && <p className="text-xs text-sell-muted-foreground mt-1" role="alert">{errors.days.message}</p>}
                        </div>
                      )}
                      {SANCTIONS.includes(action) && removable && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="h-4 w-4 accent-primary" {...register('alsoRemove')} />
                          Also remove the reported content
                        </label>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} variant={DESTRUCTIVE.includes(action) ? 'destructive' : 'default'}>
                          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
                          Confirm: {ACTION_BUTTONS.find((b) => b.action === action)?.label}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              ) : (
                <p className="text-sm text-muted-foreground border-t pt-4">
                  This report was decided{report.decided_by_user?.name ? ` by ${report.decided_by_user.name}` : ''} {formatDateTime(report.decided_at)}
                  {report.decision_note ? `: ${report.decision_note}` : '.'}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pending)} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-sell" aria-hidden="true" />
              {pending ? `${ACTION_BUTTONS.find((b) => b.action === pending.action)?.label}?` : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? CONFIRM_COPY[pending.action] : ''}
              {pending?.action === 'suspend' ? ` Length: ${pending.days} day(s).` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-sell hover:bg-sell/90"
              onClick={(e) => { e.preventDefault(); if (pending) submit(pending); }}
            >
              Yes, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * The review dialog for one report (closed while reportId is null). A render
 * helper rather than a prop-taking component, following the codebase's
 * no-propTypes style (see components/common/BrandLogo.jsx).
 */
export function renderReviewPanel(reportId, onClose, onDecided) {
  return (
    <ReviewContext.Provider value={{ reportId, onClose, onDecided }}>
      <ReviewPanel />
    </ReviewContext.Provider>
  );
}
