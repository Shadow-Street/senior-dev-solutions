import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Activity, DollarSign, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useMySubscribers } from './useAdvisorData';

const STATUS_STYLE = {
  active: 'bg-buy-muted text-buy-muted-foreground',
  expired: 'bg-surface-2 text-subtle',
  cancelled: 'bg-sell-muted text-sell-muted-foreground',
  past_due: 'bg-hold-muted text-hold-muted-foreground',
};
const FILTERS = ['all', 'active', 'expired', 'cancelled'];

const fmtDate = (d) => (d ? format(new Date(d), 'MMM dd, yyyy') : 'N/A');
const money = (n) => `₹${Number(n || 0).toLocaleString()}`;

/** One subscriber row. A plain render helper (no props object to validate). */
function renderSubscriber(sub) {
  const left = sub.end_date ? differenceInDays(new Date(sub.end_date), new Date()) : null;
  const name = sub.subscriber_name || 'Subscriber';
  return (
    <Card key={sub.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-primary text-primary-foreground">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h4 className="font-semibold text-foreground truncate">{name}</h4>
                <Badge className={`${STATUS_STYLE[sub.status] || STATUS_STYLE.expired} border-0 capitalize`}>
                  {String(sub.status || 'unknown').replace('_', ' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Plan</p><p className="font-medium text-foreground">{sub.plan_name || 'Plan removed'}</p></div>
                <div><p className="text-muted-foreground text-xs">Price</p><p className="font-medium text-foreground">{sub.plan_price === null || sub.plan_price === undefined ? 'N/A' : money(sub.plan_price)}</p></div>
                <div><p className="text-muted-foreground text-xs">Started</p><p className="font-medium text-foreground">{fmtDate(sub.start_date)}</p></div>
                <div>
                  <p className="text-muted-foreground text-xs">{sub.status === 'active' ? 'Renews / ends' : 'Ended'}</p>
                  <p className="font-medium text-foreground">
                    {sub.status === 'active' && left !== null && left >= 0 ? `${fmtDate(sub.end_date)} (${left}d)` : fmtDate(sub.end_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderStat(Icon, label, value, tone) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <Icon className={`w-8 h-8 ${tone}`} />
          <div className="ml-4">
            <p className="text-sm font-medium text-subtle">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Subscribers to the signed-in advisor's own plans (GET /advisors/subscriptions/my-subscribers). */
export default function SubscriberAnalytics() {
  const { data, isLoading, isError, refetch, isFetching } = useMySubscribers();
  const [filter, setFilter] = useState('all');

  if (isLoading) {
    return <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-border rounded" />)}</div>;
  }
  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-sell-muted-foreground mx-auto mb-3" />
          <p className="text-subtle mb-4">We could not load your subscribers.</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const subs = Array.isArray(data) ? data : [];
  const active = subs.filter((s) => s.status === 'active');
  const recurring = active.reduce((sum, s) => sum + Number(s.plan_price || 0), 0);
  const durations = subs.filter((s) => s.start_date && s.end_date).map((s) => differenceInDays(new Date(s.end_date), new Date(s.start_date)));
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const shown = filter === 'all' ? subs : subs.filter((s) => s.status === filter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {renderStat(Users, 'Total subscribers', subs.length, 'text-primary')}
        {renderStat(Activity, 'Active now', active.length, 'text-buy-muted-foreground')}
        {renderStat(DollarSign, 'Active plan value', money(recurring), 'text-protocall-premium-text')}
        {renderStat(Clock, 'Avg subscription length', `${avgDuration} days`, 'text-hold-muted-foreground')}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>All subscribers</CardTitle>
            <div className="flex gap-2" role="group" aria-label="Filter subscribers by status">
              {FILTERS.map((f) => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} aria-pressed={filter === f} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {shown.length > 0 ? (
            <div className="space-y-3">{shown.map(renderSubscriber)}</div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">{subs.length === 0 ? 'No subscribers yet' : `No ${filter} subscribers`}</p>
              {subs.length === 0 && <p className="text-muted-foreground text-sm">People who subscribe to your plans will appear here.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
