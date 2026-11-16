import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CheckCircle, RotateCcw, XCircle, Search, IndianRupee } from 'lucide-react';
import { useAuth } from '@/components/context/AuthContext';
import { financialsApi } from '@/lib/financialsApi';
import { formatDate, formatNumber } from '@/lib/format';
import RefundReviewDialog from '../refunds/RefundReviewDialog';
import { DataView, useFinanceData, inr, DataTable, EmptyRows, Pager, StatusBadge, StatCard } from './shared';

const LIMIT = 25;
const TYPE_LABELS = {
  subscription: 'Platform subscription',
  advisor_subscription: 'Advisor subscription',
  event_ticket: 'Event ticket',
  course_enrollment: 'Course',
  pledge_payment: 'Pledge',
};

/** The caller may send refunds (super admin); the server enforces this too. */
export const canProcessRefunds = (user) => (user?.app_role || user?.role) === 'super_admin';

/** Refund requests: status tracking, review, approve + refund, reject. */
export default function Refunds() {
  const { user } = useAuth();
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);
  const changeStatus = (v) => { setOffset(0); setStatus(v); };
  const changeType = (v) => { setOffset(0); setType(v); };

  const query = useFinanceData(() => financialsApi.refunds({ status, type, search }, { limit: LIMIT, offset }), [status, type, search, offset]);
  useEffect(() => {
    const d = query.data;
    if (d && d.total > 0 && offset >= d.total) setOffset(Math.floor((d.total - 1) / LIMIT) * LIMIT);
  }, [query.data, offset]);

  return (
    <div className="space-y-6">
      <DataView query={query} loadingLabel="Loading refund requests…">
        {(data) => (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard label="Awaiting review" value={formatNumber(data.stats.pending)} hint={`${inr(data.stats.pending_amount)} requested`} tone="caution" icon={Clock} />
              <StatCard label="Processing" value={formatNumber(data.stats.processing)} hint="Sent to Razorpay, not confirmed" icon={RotateCcw} />
              <StatCard label="Processed" value={formatNumber(data.stats.processed)} tone="positive" icon={CheckCircle} />
              <StatCard label="Failed / rejected" value={`${formatNumber(data.stats.failed)} / ${formatNumber(data.stats.rejected)}`} tone="negative" icon={XCircle} />
              <StatCard label="Total refunded" value={inr(data.stats.refunded_total)} hint="Recorded refunds of gateway payments" icon={IndianRupee} />
            </div>

            <Card className="shadow-sm border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Refund requests</CardTitle>
                <CardDescription>
                  Review a request to choose the payment and amount. Approved refunds are sent through Razorpay and
                  recorded against the payment; everything is written to the audit log.
                </CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="space-y-1">
                    <Label htmlFor="refund-search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <Input id="refund-search" className="pl-9" placeholder="Customer, email, payment or refund id" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} maxLength={100} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="refund-status">Status</Label>
                    <Select value={status} onValueChange={changeStatus}>
                      <SelectTrigger id="refund-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[['all', 'All statuses'], ['pending', 'Pending'], ['processing', 'Processing'], ['processed', 'Processed'], ['failed', 'Failed'], ['rejected', 'Rejected']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="refund-type">Type</Label>
                    <Select value={type} onValueChange={changeType}>
                      <SelectTrigger id="refund-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.items.length === 0 ? (
                  <EmptyRows title="No refund requests match" description="Requests from customers and automatic cancellation refunds appear here." />
                ) : (
                  <DataTable caption="Refund requests" head={['Requested', 'Customer', 'Type', 'Amount', 'Status', 'Payment', 'Action']}>
                    {data.items.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                        <td className="px-4 py-3"><span className="block font-medium text-foreground">{r.user_name || '—'}</span><span className="block text-xs text-muted-foreground">{r.user_email || ''}</span></td>
                        <td className="px-4 py-3">{TYPE_LABELS[r.type] || r.type}</td>
                        <td className="px-4 py-3 font-semibold">{inr(r.requested_amount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 text-xs font-mono break-all">{r.payment_id || '—'}{r.razorpay_refund_id && <span className="block">{r.razorpay_refund_id}</span>}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant={['pending', 'failed'].includes(r.status) ? 'default' : 'outline'} onClick={() => setOpenId(r.id)} aria-label={`Review refund request from ${r.user_name || r.user_email || 'customer'}`}>
                            {['pending', 'failed'].includes(r.status) ? 'Review' : 'View'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                )}
                <Pager total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
              </CardContent>
            </Card>
          </>
        )}
      </DataView>
      {openId && (
        <RefundReviewDialog refundId={openId} canProcess={canProcessRefunds(user)} onClose={() => setOpenId(null)} onChanged={query.reload} />
      )}
    </div>
  );
}
