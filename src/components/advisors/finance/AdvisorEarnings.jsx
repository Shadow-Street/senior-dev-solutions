import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle, Clock, Banknote, AlertCircle, RefreshCw, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useMyEarnings } from '../useAdvisorData';

const PAGE = 10;
const FILTERS = [['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved']];
const STATUS_STYLE = {
  pending: 'bg-hold-muted text-hold-muted-foreground',
  approved: 'bg-buy-muted text-buy-muted-foreground',
  cancelled: 'bg-sell-muted text-sell-muted-foreground',
};
const money = (n) => `₹${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function renderTile(Icon, label, value, hint, tone) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Icon className={`w-7 h-7 shrink-0 ${tone}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-subtle">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function renderRow(item) {
  return (
    <tr key={item.id} className="border-t border-border">
      <td className="py-3 pr-4 whitespace-nowrap">{item.created_at ? format(new Date(item.created_at), 'MMM dd, yyyy') : '-'}</td>
      <td className="py-3 pr-4">{item.plan_name || 'Subscription'}</td>
      <td className="py-3 pr-4 text-right">{item.gross_amount === null ? '-' : money(item.gross_amount)}</td>
      <td className="py-3 pr-4 text-right text-muted-foreground">{item.platform_fee === null ? '-' : `- ${money(item.platform_fee)}`}</td>
      <td className="py-3 pr-4 text-right font-semibold">{money(item.amount)}</td>
      <td className="py-3"><Badge className={`${STATUS_STYLE[item.status] || STATUS_STYLE.pending} border-0 capitalize`}>{item.status}</Badge></td>
    </tr>
  );
}

/**
 * Earnings from subscriptions: what is already withdrawable (approved) versus
 * what is waiting for staff approval (pending). Reads GET /advisors/earnings;
 * amounts come from the commission ledger, never from the browser.
 */
export default function AdvisorEarnings() {
  const [status, setStatus] = useState('all');
  const [offset, setOffset] = useState(0);
  const [, setSearchParams] = useSearchParams();
  const params = { limit: PAGE, offset, ...(status !== 'all' ? { status } : {}) };
  const { data, isLoading, isError, refetch, isFetching } = useMyEarnings(params);

  const openPayouts = () => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('section', 'financials');
    next.set('fin', 'payouts');
    return next;
  });

  if (isLoading) {
    return <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 bg-border rounded" />)}</div>;
  }
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-sell-muted-foreground mx-auto mb-3" />
          <p className="text-subtle mb-4">We could not load your earnings.</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, items, total } = data;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-foreground">Earnings</h2>
        <Button onClick={openPayouts} disabled={summary.available <= 0}>
          <Wallet className="w-4 h-4 mr-2" />
          Request payout
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {renderTile(CheckCircle, 'Approved earnings', money(summary.approved), 'Counts towards your balance', 'text-buy-muted-foreground')}
        {renderTile(Clock, 'Pending approval', money(summary.pending), `${summary.pending_count} payment${summary.pending_count === 1 ? '' : 's'} awaiting review`, 'text-hold-muted-foreground')}
        {renderTile(Wallet, 'Available to withdraw', money(summary.available), `${money(summary.pending_withdrawals)} already requested`, 'text-primary')}
        {renderTile(Banknote, 'Paid out', money(summary.total_withdrawn), 'Settled withdrawals', 'text-protocall-premium-text')}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Subscription earnings</CardTitle>
            <div className="flex gap-2" role="group" aria-label="Filter earnings by status">
              {FILTERS.map(([value, label]) => (
                <Button key={value} size="sm" variant={status === value ? 'default' : 'outline'} aria-pressed={status === value} onClick={() => { setStatus(value); setOffset(0); }}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm text-subtle">Your share of each subscription payment, after the platform fee. New earnings are pending until our team approves them.</p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10">
              <Receipt className="w-14 h-14 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{status === 'all' ? 'No earnings yet. They appear here when someone subscribes to one of your plans.' : `No ${status} earnings.`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Subscription earnings</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="pb-2 pr-4 font-medium">Date</th>
                    <th scope="col" className="pb-2 pr-4 font-medium">Plan</th>
                    <th scope="col" className="pb-2 pr-4 font-medium text-right">Paid by subscriber</th>
                    <th scope="col" className="pb-2 pr-4 font-medium text-right">Platform fee</th>
                    <th scope="col" className="pb-2 pr-4 font-medium text-right">Your earning</th>
                    <th scope="col" className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>{items.map(renderRow)}</tbody>
              </table>
            </div>
          )}

          {total > PAGE && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
              <p className="text-sm text-muted-foreground">{from}-{to} of {total}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={offset === 0 || isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
                <Button size="sm" variant="outline" disabled={offset + PAGE >= total || isFetching} onClick={() => setOffset(offset + PAGE)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
