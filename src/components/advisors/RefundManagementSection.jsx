import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Search, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useMyRefunds } from './useAdvisorData';

const STATUS = {
  pending: { tone: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending', Icon: Clock },
  approved: { tone: 'bg-premium-muted text-primary', label: 'Approved', Icon: CheckCircle },
  completed: { tone: 'bg-buy-muted text-buy-muted-foreground', label: 'Completed', Icon: CheckCircle },
  processed: { tone: 'bg-buy-muted text-buy-muted-foreground', label: 'Processed', Icon: CheckCircle },
  rejected: { tone: 'bg-sell-muted text-sell-muted-foreground', label: 'Rejected', Icon: XCircle },
};
const money = (n) => (n === null || n === undefined ? 'N/A' : `₹${Number(n).toLocaleString()}`);

function renderRefund(refund) {
  const view = STATUS[refund.status] || STATUS.pending;
  const StatusIcon = view.Icon;
  return (
    <Card key={refund.id}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{refund.subscriber_name}</h4>
              <Badge className={`${view.tone} border-0 flex items-center gap-1`}><StatusIcon className="w-3 h-3" />{view.label}</Badge>
            </div>
            {refund.reason && <p className="text-sm text-subtle">{refund.reason}</p>}
            {refund.admin_notes && <p className="text-xs text-muted-foreground mt-1">Support note: {refund.admin_notes}</p>}
          </div>
          <div className="text-right text-sm">
            <p className="text-xs text-muted-foreground">Refund amount</p>
            <p className="font-bold text-foreground">{money(refund.refund_amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">Requested {refund.created_at ? format(new Date(refund.created_at), 'MMM dd, yyyy') : '-'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Refund requests raised by this advisor's subscribers (read-only; the support
 * team decides them). Scoped on the server to the advisor's own subscriptions.
 */
export default function RefundManagementSection() {
  const { data, isLoading, isError, refetch, isFetching } = useMyRefunds();
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('all');

  if (isLoading) return <div className="animate-pulse space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-border rounded" />)}</div>;
  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-sell-muted-foreground mx-auto mb-3" />
          <p className="text-subtle mb-4">We could not load refund requests.</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const refunds = Array.isArray(data) ? data : [];
  const shown = refunds.filter((r) => (filter === 'all' || r.status === filter)
    && (!term.trim() || (r.subscriber_name || '').toLowerCase().includes(term.trim().toLowerCase())));
  const pending = refunds.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-subtle">{pending} pending of {refunds.length} request{refunds.length === 1 ? '' : 's'} from your subscribers. Refund decisions are made by our support team.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input aria-label="Search refund requests by subscriber" className="pl-9" placeholder="Search by subscriber" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter refunds by status">
          {['all', 'pending', 'completed', 'rejected'].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} aria-pressed={filter === f} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </div>
      {shown.length > 0 ? (
        <div className="space-y-3">{shown.map(renderRefund)}</div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{refunds.length === 0 ? 'No refund requests from your subscribers.' : 'No requests match your filters.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
