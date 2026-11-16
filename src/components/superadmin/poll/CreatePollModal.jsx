import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, X } from 'lucide-react';
import { getPollTally } from '@/lib/pollVotes';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { DEFAULT_OPTIONS, POLL_TYPE_LABELS, toLocalInput, pollIdOf } from './pollAdminModel';

const TYPES = ['buy_sell_hold', 'sentiment', 'price_target', 'yes_no', 'admin_recommendation', 'custom'];

const schema = z.object({
  title: z.string().trim().min(3, 'At least 3 characters').max(200, 'At most 200 characters'),
  description: z.string().max(2000, 'At most 2000 characters').optional(),
  stock_symbol: z.string().trim().max(20).regex(/^$|^[A-Za-z0-9][A-Za-z0-9.&_-]*$/, 'Letters, numbers and . & _ - only').optional(),
  poll_type: z.enum(TYPES),
  options: z.array(z.object({ label: z.string().trim().min(1, 'Required').max(80, 'At most 80 characters') }))
    .min(2, 'At least 2 options').max(6, 'At most 6 options')
    .refine((opts) => new Set(opts.map((o) => o.label.trim().toLowerCase())).size === opts.length, 'Options must be different'),
  access: z.enum(['general', 'premium']),
  expires_at: z.string().optional().refine((v) => !v || new Date(v) > new Date(), 'Must be in the future'),
  target_price: z.string().optional().refine((v) => !v || (Number(v) >= 0 && Number.isFinite(Number(v))), 'Enter a positive number'),
  confidence_score: z.string().optional(),
  image_url: z.string().trim().max(500).regex(/^$|^https:\/\/\S+$/i, 'Must be an https:// link').optional(),
});

const blank = (type = 'buy_sell_hold') => ({
  title: '', description: '', stock_symbol: '', poll_type: type,
  options: DEFAULT_OPTIONS[type].map((label) => ({ label })),
  access: 'general', expires_at: '', target_price: '', confidence_score: 'none', image_url: '',
});

const fromPoll = (poll) => {
  const labels = getPollTally(poll).options.map((o) => o.label);
  return {
    title: poll.title || poll.question || '',
    description: poll.description || '',
    stock_symbol: poll.stock_symbol || '',
    poll_type: TYPES.includes(poll.poll_type) ? poll.poll_type : 'custom',
    options: labels.map((label) => ({ label })),
    access: poll.is_premium ? 'premium' : 'general',
    expires_at: toLocalInput(poll.expires_at),
    target_price: poll.target_price == null ? '' : String(poll.target_price),
    confidence_score: poll.confidence_score == null ? 'none' : String(poll.confidence_score),
    image_url: poll.image_url || '',
  };
};

const renderError = (message, id) => (message ? <p id={id} className="text-xs text-sell-muted-foreground">{message}</p> : null);

/** Create a poll, or edit one when `poll` is given. Options lock once a poll has votes. */
export default function CreatePollModal({ open, poll, onClose, onSaved }) {
  const editId = pollIdOf(poll);
  const isEdit = Boolean(editId);
  const hasVotes = isEdit && getPollTally(poll).total > 0;
  const [serverError, setServerError] = useState('');

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting, dirtyFields } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: blank(),
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'options' });

  // Reset only when the dialog opens or switches poll - never while typing.
  useEffect(() => {
    if (open) {
      reset(poll ? fromPoll(poll) : blank());
      setServerError('');
    }
  }, [open, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pollType = watch('poll_type');

  const onTypeChange = (type) => {
    setValue('poll_type', type, { shouldDirty: true });
    if (!hasVotes) replace(DEFAULT_OPTIONS[type].map((label) => ({ label })));
  };

  const onSubmit = async (values) => {
    setServerError('');
    const body = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      stock_symbol: values.stock_symbol?.trim().toUpperCase() || null,
      is_premium: values.access === 'premium',
      expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
      target_price: values.target_price === '' || values.target_price == null ? null : Number(values.target_price),
      confidence_score: values.confidence_score && values.confidence_score !== 'none' ? Number(values.confidence_score) : null,
      image_url: values.image_url?.trim() || null,
    };
    if (!hasVotes) {
      body.poll_type = values.poll_type;
      body.options = values.options.map((o) => o.label.trim());
    }
    if (isEdit && !dirtyFields.expires_at) delete body.expires_at; // keep an already-passed end time as is

    try {
      if (isEdit) {
        await pollAdminApi.update(editId, body);
        onSaved('Poll updated');
      } else {
        await pollAdminApi.create(body);
        onSaved('Poll created');
      }
    } catch (error) {
      setServerError(errorMessage(error, isEdit ? 'Could not save the poll.' : 'Could not create the poll.'));
    }
  };

  const Icon = isEdit ? Pencil : Plus;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
            {isEdit ? 'Edit poll' : 'Create new poll'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Changes are visible to members straight away and recorded in the audit log.' : 'Admin polls are marked as admin-created and announced to members.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="poll-title">Question *</Label>
              <Input id="poll-title" placeholder="e.g. Should we buy RELIANCE before earnings?" aria-invalid={Boolean(errors.title)} aria-describedby="poll-title-error" {...register('title')} />
              {renderError(errors.title?.message, 'poll-title-error')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-symbol">Stock symbol</Label>
              <Input id="poll-symbol" placeholder="e.g. RELIANCE" className="uppercase" aria-invalid={Boolean(errors.stock_symbol)} aria-describedby="poll-symbol-error" {...register('stock_symbol')} />
              {renderError(errors.stock_symbol?.message, 'poll-symbol-error')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-description">Description</Label>
            <Textarea id="poll-description" rows={3} placeholder="Context or analysis for this poll" {...register('description')} />
            {renderError(errors.description?.message)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poll-type">Poll type</Label>
              <Select value={pollType} onValueChange={onTypeChange} disabled={hasVotes}>
                <SelectTrigger id="poll-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{POLL_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-access">Who can vote</Label>
              <Controller
                control={control}
                name="access"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="poll-access"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Everyone (general)</SelectItem>
                      <SelectItem value="premium">Premium members only</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Answer options *</legend>
            {hasVotes && <p className="text-xs text-subtle">This poll already has votes, so its options and type are locked.</p>}
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input aria-label={`Option ${i + 1}`} disabled={hasVotes} {...register(`options.${i}.label`)} aria-invalid={Boolean(errors.options?.[i]?.label)} />
                {!hasVotes && fields.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label={`Remove option ${i + 1}`}>
                    <X className="w-4 h-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            {renderError(errors.options?.message || errors.options?.root?.message || errors.options?.find?.((o) => o?.label)?.label?.message)}
            {!hasVotes && fields.length < 6 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ label: '' })}>
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" />Add option
              </Button>
            )}
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poll-ends">End time</Label>
              <Input id="poll-ends" type="datetime-local" aria-invalid={Boolean(errors.expires_at)} {...register('expires_at')} />
              {renderError(errors.expires_at?.message)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-target">Target price (₹)</Label>
              <Input id="poll-target" type="number" step="0.01" min="0" placeholder="e.g. 2500" {...register('target_price')} />
              {renderError(errors.target_price?.message)}
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-confidence">Confidence</Label>
              <Controller
                control={control}
                name="confidence_score"
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={field.onChange}>
                    <SelectTrigger id="poll-confidence"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="1">1 - Low</SelectItem>
                      <SelectItem value="2">2 - Moderate</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="4">4 - High</SelectItem>
                      <SelectItem value="5">5 - Very high</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-image">Image URL</Label>
            <Input id="poll-image" placeholder="https://..." {...register('image_url')} />
            {renderError(errors.image_url?.message)}
          </div>

          {serverError && <p role="alert" className="rounded-md bg-sell-muted p-3 text-sm text-sell-muted-foreground">{serverError}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create poll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
