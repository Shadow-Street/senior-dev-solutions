import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { financialsApi, apiErrorMessage, TIER_LABELS } from '@/lib/financialsApi';
import { formatDateTime } from '@/lib/format';
import { DataView, useFinanceData, inr, DataTable, EmptyRows, Pager, StatusBadge } from './shared';

const LIMIT = 25;
const FILTERS = [
  { key: 'status', label: 'Status', options: [['all', 'All statuses'], ['success', 'Success'], ['pending', 'Pending'], ['abandoned', 'Abandoned'], ['failed', 'Failed'], ['refunded', 'Refunded'], ['partially_refunded', 'Partly refunded']] },
  { key: 'record', label: 'Type', options: [['all', 'All types'], ['charge', 'Payments'], ['refund', 'Refunds'], ['attempt', 'Unpaid / failed attempts']] },
  { key: 'kind', label: 'Source', options: [['all', 'All sources'], ['platform', 'Platform plans'], ['advisor', 'Advisor plans'], ['other', 'Other']] },
  { key: 'tier', label: 'Tier', options: [['all', 'All tiers'], ['basic', 'Basic'], ['premium', 'Premium'], ['vip', 'VIP'], ['other', 'Other']] },
];

const RECORD_LABEL = { charge: 'Payment', refund: 'Refund', attempt: 'Checkout' };

function planLabel(tx) {
  if (tx.kind === 'advisor') return `${tx.plan_name || 'Advisor plan'}${tx.advisor_name ? ` · ${tx.advisor_name}` : ''}`;
  if (tx.kind === 'platform') return tx.plan_name || TIER_LABELS[tx.tier] || 'Platform plan';
  return tx.plan_name || 'Other';
}

export default function Transactions({ range }) {
  const [filters, setFilters] = useState({ status: 'all', record: 'all', kind: 'all', tier: 'all' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Debounce the search box. Every filter change goes back to page 1 in the same update,
  // so no request is made with the new filters and the old page.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);
  const [rangeKey, setRangeKey] = useState(`${range.from}|${range.to}`);
  if (rangeKey !== `${range.from}|${range.to}`) { setRangeKey(`${range.from}|${range.to}`); setOffset(0); }
  const setFilter = (key, value) => { setOffset(0); setFilters((p) => ({ ...p, [key]: value })); };

  const query = useFinanceData(
    () => financialsApi.transactions(range, { ...filters, search }, { limit: LIMIT, offset }),
    [range.from, range.to, filters.status, filters.record, filters.kind, filters.tier, search, offset]
  );

  // The last page can empty out (rows refunded or filtered away): step back to a real page.
  useEffect(() => {
    const d = query.data;
    if (d && d.total > 0 && offset >= d.total) setOffset(Math.floor((d.total - 1) / LIMIT) * LIMIT);
  }, [query.data, offset]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { truncated } = await financialsApi.exportTransactions(range, { ...filters, search });
      toast.success(truncated ? `Exported the first ${truncated} rows` : 'Transactions exported');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="shadow-sm border bg-white">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">All transactions</CardTitle>
            <CardDescription>Captured payments, refunds, and checkouts that are still pending or failed at Razorpay.</CardDescription>
          </div>
          <Button onClick={exportCsv} disabled={exporting} variant="outline">
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4 mr-2" aria-hidden="true" />}
            Export CSV
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
          <div className="space-y-1 xl:col-span-1">
            <Label htmlFor="tx-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="tx-search" className="pl-9" placeholder="Customer, email, pay_/order_/rfnd_ id" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} maxLength={100} />
            </div>
          </div>
          {FILTERS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`tx-${f.key}`}>{f.label}</Label>
              <Select value={filters[f.key]} onValueChange={(v) => setFilter(f.key, v)}>
                <SelectTrigger id={`tx-${f.key}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {f.options.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataView query={query} loadingLabel="Loading transactions…">
          {(data) => (
            <>
              {data.attempts_recorded === false && (
                <p className="px-4 pb-2 text-xs text-muted-foreground">Pending and failed checkouts are recorded once migration 021 is applied.</p>
              )}
              {data.items.length === 0 ? (
                <EmptyRows title="No transactions match" description="Change the period or the filters." />
              ) : (
                <DataTable caption="Transactions" head={['Date', 'Type', 'Status', 'Customer', 'Plan / advisor', 'Amount', 'Gateway ids']}>
                  {data.items.map((tx) => (
                    <tr key={`${tx.record}-${tx.id}`} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(tx.date)}</td>
                      <td className="px-4 py-3">{RECORD_LABEL[tx.record] || tx.record}{tx.is_renewal ? <span className="block text-xs text-muted-foreground">Renewal</span> : null}</td>
                      <td className="px-4 py-3"><StatusBadge status={tx.status} />{tx.error && <span className="block text-xs text-sell mt-1">{tx.error}</span>}</td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-foreground">{tx.user_name || '—'}</span>
                        <span className="block text-xs text-muted-foreground">{tx.user_email || ''}</span>
                      </td>
                      <td className="px-4 py-3">{planLabel(tx)}{tx.coupon ? <span className="block text-xs text-muted-foreground">Promo {tx.coupon}{tx.discount ? ` (−${inr(tx.discount)})` : ''}</span> : null}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${tx.record === 'refund' ? 'text-sell' : ''}`}>{tx.record === 'refund' ? '−' : ''}{inr(tx.amount)}</td>
                      <td className="px-4 py-3 text-xs font-mono break-all">
                        {tx.payment_id && <span className="block">pay: {tx.payment_id}</span>}
                        {tx.order_id && <span className="block">order: {tx.order_id}</span>}
                        {tx.refund_id && <span className="block">refund: {tx.refund_id}</span>}
                        {!tx.payment_id && !tx.order_id && !tx.refund_id && <span>{tx.gateway || '—'}</span>}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              )}
              <Pager total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
            </>
          )}
        </DataView>
      </CardContent>
    </Card>
  );
}

Transactions.propTypes = {
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
};
