import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Globe, Lock, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { useMyPlans, useMySubscribers } from './useAdvisorData';

/**
 * Who a post reaches. View counts are not tracked, so this reports what is
 * actually known: the audience setting and how many of your active subscribers
 * are entitled to read it (the same rule the server applies).
 */
function describeAudience(post, plans, subscribers) {
  const active = subscribers.filter((s) => s.status === 'active');
  if (post.visibility === 'public') {
    return { label: 'Public - anyone can read it', icon: Globe, eligible: active.length, note: 'All of your active subscribers can read it, as can visitors without an account.' };
  }
  const required = plans.find((p) => p.id === post.required_plan_id);
  if (!required) {
    return { label: 'Any active subscriber', icon: Lock, eligible: active.length, note: 'Visitors and non-subscribers see a locked preview with the title only.' };
  }
  const eligible = active.filter((s) => Number(s.plan_price) >= Number(required.price)).length;
  return { label: `${required.name} plan and above`, icon: Lock, eligible, note: 'Subscribers on cheaper plans see a locked preview with the title only.' };
}

export default function PostAnalyticsModal({ open, onClose, post }) {
  const plansQuery = useMyPlans(open);
  const subsQuery = useMySubscribers(open);
  if (!post) return null;

  const ready = !plansQuery.isLoading && !subsQuery.isLoading;
  const failed = plansQuery.isError || subsQuery.isError;
  const audience = ready && !failed ? describeAudience(post, plansQuery.data || [], subsQuery.data || []) : null;
  const AudienceIcon = audience?.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post reach</DialogTitle>
          <DialogDescription>{post.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={post.status === 'published' ? 'bg-buy-muted text-buy-muted-foreground border-0' : 'bg-surface-2 text-subtle border-0'}>
              {post.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
            {post.stock_symbol && <Badge variant="outline">{post.stock_symbol}</Badge>}
            {post.recommendation_type && <Badge variant="outline" className="uppercase">{post.recommendation_type}</Badge>}
          </div>

          <div className="flex items-center gap-2 text-sm text-subtle">
            <CalendarDays className="w-4 h-4" />
            {post.created_at ? format(new Date(post.created_at), 'MMM d, yyyy h:mm a') : 'Date unknown'}
          </div>

          {!ready && <div className="animate-pulse h-24 bg-border rounded" aria-busy="true" />}
          {ready && failed && <p className="text-sm text-sell-muted-foreground">We could not load your subscribers, so the audience size is unavailable.</p>}
          {audience && (
            <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-foreground"><AudienceIcon className="w-4 h-4 text-primary" />{audience.label}</p>
              <p className="flex items-center gap-2 text-2xl font-bold text-foreground"><Users className="w-5 h-5 text-primary" />{audience.eligible}<span className="text-sm font-normal text-subtle">active subscriber{audience.eligible === 1 ? '' : 's'} can read this</span></p>
              <p className="text-xs text-muted-foreground">{post.status === 'published' ? audience.note : 'Drafts are visible only to you until you publish them.'}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
