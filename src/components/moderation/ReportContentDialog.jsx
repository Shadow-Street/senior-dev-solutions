import { createContext, useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Flag, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { moderationApi, moderationErrorMessage } from '@/lib/moderationApi';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or self-promotion' },
  { value: 'scam', label: 'Scam, fraud or phishing' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'personal_info', label: 'Sharing personal information' },
  { value: 'misinformation', label: 'Misleading financial advice' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

const schema = z
  .object({
    reason: z.enum(REPORT_REASONS.map((r) => r.value), { errorMap: () => ({ message: 'Choose a reason.' }) }),
    note: z.string().max(1000, 'Keep it under 1000 characters.').optional().default(''),
  })
  .superRefine((v, ctx) => {
    if (v.reason === 'other' && !v.note.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Tell us briefly what is wrong.' });
  });

const TITLES = { message: 'Report message', advisor_post: 'Report post', user: 'Report user' };

const ReportTargetContext = createContext({ target: null, onClose: () => {} });

/**
 * Member-facing report form. target.type is message | advisor_post | user.
 * The server decides who the author is and what was said; only the target id,
 * the reason and an optional note are sent.
 */
function ReportContentDialog() {
  const { target, onClose } = useContext(ReportTargetContext);
  const open = Boolean(target);
  const targetType = target?.type;
  const targetId = target?.id;
  const targetLabel = target?.label;
  const onOpenChange = (next) => { if (!next) onClose(); };
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { reason: undefined, note: '' } });

  useEffect(() => { if (open) reset({ reason: undefined, note: '' }); }, [open, reset]);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const res = await moderationApi.report({ targetType, targetId, reason: values.reason, note: values.note.trim() || undefined });
      toast.success(res?.duplicate ? 'You have already reported this. Our moderators will review it.' : 'Thanks. Our moderators will review your report.');
      onOpenChange(false);
    } catch (e) {
      toast.error(moderationErrorMessage(e, 'Could not send your report. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="w-4 h-4 text-sell" aria-hidden="true" />{TITLES[targetType] || 'Report'}</DialogTitle>
          <DialogDescription>
            {targetLabel ? `${targetLabel}. ` : ''}Reports are confidential: the person you report is not told who reported them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label={TITLES[targetType] || 'Report'}>
          <fieldset>
            <legend className="text-sm font-medium mb-2">Why are you reporting this?</legend>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-surface-2 cursor-pointer">
                  <input type="radio" value={r.value} className="h-4 w-4 accent-primary" {...register('reason')} />
                  {r.label}
                </label>
              ))}
            </div>
            {errors.reason && <p className="text-xs text-sell-muted-foreground mt-1" role="alert">{errors.reason.message}</p>}
          </fieldset>
          <div>
            <Label htmlFor="report-note">Details (optional)</Label>
            <Textarea id="report-note" rows={3} className="mt-1" maxLength={1000} {...register('note')} />
            {errors.note && <p className="text-xs text-sell-muted-foreground mt-1" role="alert">{errors.note.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Renders the report dialog for `target` ({ type, id, label } or null to keep
 * it closed). A render helper rather than a prop-taking component, following
 * the codebase's no-propTypes style (see components/common/BrandLogo.jsx).
 */
export function renderReportDialog(target, onClose) {
  return (
    <ReportTargetContext.Provider value={{ target, onClose }}>
      <ReportContentDialog />
    </ReportTargetContext.Provider>
  );
}
