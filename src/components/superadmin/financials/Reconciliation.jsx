import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Download } from 'lucide-react';
import { financialsApi, apiErrorMessage, presetRange } from '@/lib/financialsApi';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { ErrorState, EmptyRows, DataTable, StatusBadge, StatCard, inr } from './shared';

export const CATEGORY_LABELS = {
  matched: 'Matched',
  missing_in_db: 'Missing in our records',
  missing_at_gateway: 'Missing at Razorpay',
  amount_mismatch: 'Amount mismatch',
  status_mismatch: 'Status mismatch',
  refund_mismatch: 'Refund mismatch',
  failed_at_gateway: 'Failed at Razorpay',
  in_progress: 'Not captured yet',
};
const PROBLEMS = ['missing_in_db', 'missing_at_gateway', 'amount_mismatch', 'status_mismatch', 'refund_mismatch'];

/** CSV of the result, built in the browser from the server's comparison (formula-escaped). */
function exportItems(items) {
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Category', 'Payment id', 'Order id', 'Razorpay amount', 'Razorpay status', 'Razorpay refunded', 'Recorded amount', 'Recorded status', 'Recorded refunded', 'Note'];
  const rows = items.map((i) => [CATEGORY_LABELS[i.category] || i.category, i.payment_id, i.order_id, i.gateway?.amount, i.gateway?.status, i.gateway?.amount_refunded, i.db?.amount, i.db?.status, i.db?.refunded, i.note]);
  const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'razorpay-reconciliation.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Compares Razorpay's payments for the period with recorded transactions. Nothing
 * is changed: differences are listed for review. The range is the page's period
 * (at most 92 days; "All time" uses the last 30 days).
 */
export default function Reconciliation({ range }) {
  const effective = range.from && range.to ? range : presetRange('last_30_days');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [category, setCategory] = useState('issues');
  // A result belongs to the period it was run for: clear it when the period changes.
  useEffect(() => { setResult(null); setError(null); }, [effective.from, effective.to]);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await financialsApi.reconcile({ from: effective.from, to: effective.to }));
    } catch (e) {
      setError(apiErrorMessage(e, 'Reconciliation failed.'));
    } finally {
      setRunning(false);
    }
  };

  const items = useMemo(() => {
    if (!result) return [];
    if (category === 'issues') return result.items.filter((i) => PROBLEMS.includes(i.category));
    if (category === 'all') return result.items;
    return result.items.filter((i) => i.category === category);
  }, [result, category]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" /> Payment reconciliation</CardTitle>
          <CardDescription>
            Fetches Razorpay&apos;s payments for {effective.from} to {effective.to} and compares each payment id, amount, status and
            refunded amount with our records. Nothing is changed automatically; review each difference. Ranges are limited to 92 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Button onClick={run} disabled={running}>
            {running && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            {running ? 'Comparing with Razorpay…' : 'Run reconciliation'}
          </Button>
          {result && <span className="text-sm text-subtle">Last run {formatDateTime(result.generated_at)} for {formatDate(result.range?.from)} – {formatDate(result.range?.to)}</span>}
        </CardContent>
      </Card>

      {error && <ErrorState message={error} onRetry={run} />}

      {result && (
        <>
          {result.truncated && (
            <p role="alert" className="text-sm text-hold-muted-foreground bg-hold-muted rounded-lg p-3">The period has more payments than one run checks. Use a shorter range to compare everything.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Razorpay payments" value={formatNumber(result.gateway_payments)} />
            <StatCard label="Recorded payments" value={formatNumber(result.recorded_charges)} />
            <StatCard label="Matched" value={formatNumber(result.summary.matched)} tone="positive" />
            <StatCard label="Needs review" value={formatNumber(result.issues)} tone={result.issues ? 'negative' : 'positive'} />
          </div>
          <Card className="shadow-sm border bg-white">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="recon-category">Show</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="recon-category" className="w-full md:w-[260px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="issues">Needs review ({formatNumber(result.issues)})</SelectItem>
                      <SelectItem value="all">Everything ({formatNumber(result.items.length)})</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l} ({formatNumber(result.summary[k] || 0)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => exportItems(items)} disabled={!items.length}>
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Download these rows
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <EmptyRows title={category === 'issues' ? 'No differences found' : 'Nothing in this category'} description={category === 'issues' ? 'Every Razorpay payment in the period matches our records.' : undefined} />
              ) : (
                <DataTable caption="Reconciliation results" head={['Result', 'Payment', 'Razorpay', 'Our record', 'Note']}>
                  {items.map((i) => (
                    <tr key={`${i.category}-${i.payment_id}`} className="align-top">
                      <td className="px-4 py-3"><StatusBadge status={PROBLEMS.includes(i.category) ? 'failed' : i.category} label={CATEGORY_LABELS[i.category]} /></td>
                      <td className="px-4 py-3 text-xs font-mono break-all">{i.payment_id}{i.order_id && <span className="block text-muted-foreground">{i.order_id}</span>}</td>
                      <td className="px-4 py-3 text-xs">{i.gateway ? <>{inr(i.gateway.amount)} · {i.gateway.status}{i.gateway.amount_refunded ? <span className="block">refunded {inr(i.gateway.amount_refunded)}</span> : null}{i.gateway.email && <span className="block text-muted-foreground">{i.gateway.email}</span>}</> : '—'}</td>
                      <td className="px-4 py-3 text-xs">{i.db ? <>{inr(i.db.amount)} · {i.db.status}{i.db.refunded ? <span className="block">refunded {inr(i.db.refunded)}</span> : null}<span className="block text-muted-foreground">{formatDateTime(i.db.date)}</span></> : '—'}</td>
                      <td className="px-4 py-3 text-xs">{i.note || ''}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

Reconciliation.propTypes = {
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
};
