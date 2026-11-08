import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useMyPlans } from './useAdvisorData';

const BLANK = {
  title: '',
  content: '',
  stock_symbol: '',
  recommendation_type: 'none',
  target_price: '',
  stop_loss: '',
  time_horizon: 'none',
  visibility: 'subscribers',
  required_plan_id: 'all',
  post_type: 'recommendation',
};

/** Form state from a saved post (edit mode) or blank (create). */
function toForm(post) {
  if (!post) return { ...BLANK };
  return {
    title: post.title || '',
    content: post.content || '',
    stock_symbol: post.stock_symbol || '',
    recommendation_type: post.recommendation_type || 'none',
    target_price: post.target_price ? String(Number(post.target_price)) : '',
    stop_loss: post.stop_loss ? String(Number(post.stop_loss)) : '',
    time_horizon: post.time_horizon || 'none',
    visibility: post.visibility || 'subscribers',
    required_plan_id: post.required_plan_id || 'all',
    post_type: post.post_type || 'recommendation',
  };
}

/** API payload from the form. Empty optional values are sent as null so an edit can clear them. */
function toPayload(form, status) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    stock_symbol: form.stock_symbol.trim() || null,
    recommendation_type: form.recommendation_type === 'none' ? null : form.recommendation_type,
    target_price: form.target_price === '' ? null : Number(form.target_price),
    stop_loss: form.stop_loss === '' ? null : Number(form.stop_loss),
    time_horizon: form.time_horizon === 'none' ? null : form.time_horizon,
    visibility: form.visibility,
    required_plan_id: form.visibility === 'public' || form.required_plan_id === 'all' ? null : form.required_plan_id,
    post_type: form.post_type,
    status,
  };
}

/**
 * Create / edit an advisory. `onSubmit(payload)` must throw to keep the dialog
 * open. The audience choice is enforced by the server: "Public" posts are
 * readable by anyone, "Subscribers" posts only by this advisor's active
 * subscribers (optionally only on a chosen plan or a more expensive one).
 */
export default function CreatePostModal({ open, onClose, onSubmit, editingPost }) {
  const [form, setForm] = useState(() => toForm(editingPost));
  const [saving, setSaving] = useState(null); // 'published' | 'draft' | null
  const plansQuery = useMyPlans(open);
  const plans = (plansQuery.data || []).filter((p) => p.is_active);

  useEffect(() => {
    if (open) setForm(toForm(editingPost));
  }, [open, editingPost]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = async (status) => {
    if (form.title.trim().length < 3) { toast.error('Add a title (at least 3 characters).'); return; }
    if (!form.content.trim()) { toast.error('Add the advisory content.'); return; }
    for (const [key, label] of [['target_price', 'Target price'], ['stop_loss', 'Stop loss']]) {
      if (form[key] !== '' && !(Number(form[key]) > 0)) { toast.error(`${label} must be a positive number.`); return; }
    }
    setSaving(status);
    try {
      await onSubmit(toPayload(form, status));
    } catch {
      // The caller reports the failure; keep the dialog open so nothing is lost.
    } finally {
      setSaving(null);
    }
  };

  const isEdit = Boolean(editingPost);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit advisory' : 'Create advisory post'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); save('published'); }} className="space-y-4" noValidate>
          <div className="bg-surface-2 border-2 border-protocall-premium-light rounded-lg p-4 space-y-3">
            <Label className="text-base font-semibold text-foreground block">Who can read this?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Audience">
              <Button
                type="button"
                role="radio"
                aria-checked={form.visibility === 'subscribers'}
                variant={form.visibility === 'subscribers' ? 'default' : 'outline'}
                className="h-auto justify-start py-3"
                onClick={() => set({ visibility: 'subscribers' })}
              >
                <Lock className="w-4 h-4 mr-2 shrink-0" />
                <span className="text-left">
                  <span className="block font-semibold">Subscribers only</span>
                  <span className="block text-xs font-normal opacity-80">Your active subscribers</span>
                </span>
              </Button>
              <Button
                type="button"
                role="radio"
                aria-checked={form.visibility === 'public'}
                variant={form.visibility === 'public' ? 'default' : 'outline'}
                className="h-auto justify-start py-3"
                onClick={() => set({ visibility: 'public' })}
              >
                <Globe className="w-4 h-4 mr-2 shrink-0" />
                <span className="text-left">
                  <span className="block font-semibold">Public</span>
                  <span className="block text-xs font-normal opacity-80">Anyone, even without an account</span>
                </span>
              </Button>
            </div>

            {form.visibility === 'subscribers' && (
              <div>
                <Label htmlFor="post-plan">Plan required</Label>
                <Select value={form.required_plan_id} onValueChange={(value) => set({ required_plan_id: value })}>
                  <SelectTrigger id="post-plan" className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any active subscriber</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} and above (₹{Number(plan.price).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {plansQuery.isError && <p className="text-xs text-sell-muted-foreground mt-1">Could not load your plans.</p>}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="post_type">Post type</Label>
            <Select value={form.post_type} onValueChange={(value) => set({ post_type: value })}>
              <SelectTrigger id="post_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recommendation">Stock recommendation</SelectItem>
                <SelectItem value="analysis">Market analysis</SelectItem>
                <SelectItem value="educational">Educational content</SelectItem>
                <SelectItem value="update">Market update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Buy RELIANCE, target 3000" />
          </div>

          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea id="content" value={form.content} maxLength={10000} onChange={(e) => set({ content: e.target.value })} placeholder="Your analysis and the reasoning behind it" rows={6} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock_symbol">Stock symbol</Label>
              <Input id="stock_symbol" value={form.stock_symbol} maxLength={32} onChange={(e) => set({ stock_symbol: e.target.value.toUpperCase() })} placeholder="e.g. RELIANCE" />
            </div>
            <div>
              <Label htmlFor="recommendation_type">Call</Label>
              <Select value={form.recommendation_type} onValueChange={(value) => set({ recommendation_type: value })}>
                <SelectTrigger id="recommendation_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific call</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="target_price">Target price (₹)</Label>
              <Input id="target_price" type="number" min="0" step="0.01" value={form.target_price} onChange={(e) => set({ target_price: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="stop_loss">Stop loss (₹)</Label>
              <Input id="stop_loss" type="number" min="0" step="0.01" value={form.stop_loss} onChange={(e) => set({ stop_loss: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="time_horizon">Time horizon</Label>
              <Select value={form.time_horizon} onValueChange={(value) => set({ time_horizon: value })}>
                <SelectTrigger id="time_horizon"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="short_term">Short term (1-3 months)</SelectItem>
                  <SelectItem value="medium_term">Medium term (3-12 months)</SelectItem>
                  <SelectItem value="long_term">Long term (1+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={Boolean(saving)} className="flex-1">Cancel</Button>
            <Button type="button" variant="outline" onClick={() => save('draft')} disabled={Boolean(saving)} className="flex-1">
              {saving === 'draft' ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : 'Save as draft'}
            </Button>
            <Button type="submit" disabled={Boolean(saving)} className="flex-1">
              {saving === 'published' ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing...</>) : isEdit ? 'Save & publish' : 'Publish'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
