import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, TrendingUp, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { useMyEarnings, useMyPlans, useMyPosts, useMySubscribers } from './useAdvisorData';

const MONTHS = 6;
const money = (n) => `₹${Number(n || 0).toLocaleString()}`;

/** Earnings per calendar month for the last MONTHS months (zero-filled). */
function monthlySeries(items) {
  const buckets = [];
  for (let i = MONTHS - 1; i >= 0; i -= 1) {
    const start = startOfMonth(subMonths(new Date(), i));
    buckets.push({ key: format(start, 'yyyy-MM'), label: format(start, 'MMM'), approved: 0, pending: 0 });
  }
  for (const item of items) {
    if (!item.created_at) continue;
    const bucket = buckets.find((b) => b.key === format(new Date(item.created_at), 'yyyy-MM'));
    if (!bucket) continue;
    if (item.status === 'approved') bucket.approved += Number(item.amount || 0);
    else if (item.status === 'pending') bucket.pending += Number(item.amount || 0);
  }
  return buckets.map((b) => ({ ...b, total: Math.round((b.approved + b.pending) * 100) / 100 }));
}

function renderTile(Icon, label, value, tone) {
  return (
    <div className="text-center p-4 bg-surface-2 rounded-xl">
      <Icon className={`w-6 h-6 mx-auto mb-2 ${tone}`} />
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-subtle mt-1">{label}</div>
    </div>
  );
}

function renderBar(label, count, max, hint) {
  const width = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div key={label}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-subtle">{hint}</span>
      </div>
      <div className="h-2 rounded-full bg-border" role="presentation">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/**
 * Analytics computed from the advisor's real records: posts, plans, subscribers
 * and the commission ledger. (View counts are not tracked, so none are shown.)
 */
export default function AdvisorAnalytics() {
  const posts = useMyPosts();
  const plans = useMyPlans();
  const subs = useMySubscribers();
  const earnings = useMyEarnings({ limit: 100 });

  if ([posts, plans, subs, earnings].some((q) => q.isLoading)) {
    return <div className="animate-pulse space-y-4" aria-busy="true"><div className="h-28 bg-border rounded" /><div className="h-72 bg-border rounded" /></div>;
  }
  if ([posts, plans, subs, earnings].some((q) => q.isError)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-sell-muted-foreground mx-auto mb-3" />
          <p className="text-subtle mb-4">We could not load your analytics.</p>
          <Button variant="outline" onClick={() => [posts, plans, subs, earnings].forEach((q) => q.isError && q.refetch())}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const allPosts = posts.data || [];
  const published = allPosts.filter((p) => p.status === 'published');
  const activeSubs = (subs.data || []).filter((s) => s.status === 'active');
  const series = monthlySeries(earnings.data?.items || []);
  const hasRevenue = series.some((m) => m.total > 0);
  const subsByPlan = (plans.data || []).map((plan) => ({ plan, count: activeSubs.filter((s) => s.plan_id === plan.id).length }));
  const maxSubs = Math.max(0, ...subsByPlan.map((x) => x.count));
  const publicCount = published.filter((p) => p.visibility === 'public').length;
  const memberCount = published.length - publicCount;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-surface-2"><CardTitle>Overview</CardTitle></CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {renderTile(FileText, 'Posts', allPosts.length, 'text-primary')}
            {renderTile(Eye, 'Published', published.length, 'text-buy-muted-foreground')}
            {renderTile(Users, 'Active subscribers', activeSubs.length, 'text-protocall-premium-text')}
            {renderTile(TrendingUp, 'Earned this month', money(series[series.length - 1].total), 'text-hold-muted-foreground')}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-surface-2"><CardTitle>Earnings by month</CardTitle></CardHeader>
        <CardContent className="p-6">
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(value) => [money(value), 'Earnings (approved + pending)']} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-subtle">No earnings in the last {MONTHS} months yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-surface-2"><CardTitle>Subscribers by plan</CardTitle></CardHeader>
          <CardContent className="p-6 space-y-4">
            {subsByPlan.length === 0 ? <p className="text-subtle text-center py-6">Create a plan to start collecting subscribers.</p>
              : subsByPlan.map(({ plan, count }) => renderBar(plan.name, count, maxSubs, `${count} active`))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-surface-2"><CardTitle>Published posts by audience</CardTitle></CardHeader>
          <CardContent className="p-6 space-y-4">
            {published.length === 0 ? <p className="text-subtle text-center py-6">No published posts yet.</p> : (
              <>
                {renderBar('Public', publicCount, published.length, `${publicCount} of ${published.length}`)}
                {renderBar('Subscribers only', memberCount, published.length, `${memberCount} of ${published.length}`)}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
