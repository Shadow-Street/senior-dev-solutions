import { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { financialsApi, apiErrorMessage, monthLabel, STATUS_LABELS } from '@/lib/financialsApi';
import { formatDate, formatNumber } from '@/lib/format';
import { DataView, useFinanceData, inr, DataTable, StatCard, EmptyRows } from './shared';
import { sourceRows } from './Overview';

/** Analytics & Reports: monthly performance, transaction summary, breakdowns, downloadable report. */
export default function Reports({ range }) {
  const query = useFinanceData(() => financialsApi.analytics(range), [range.from, range.to]);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await financialsApi.exportMonthlyReport(range);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not download the report'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DataView query={query} loadingLabel="Building the report…">
      {(data) => {
        const months = data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
        const hasData = months.some((m) => m.gross || m.refunds || m.failed || m.pending);
        const best = months.reduce((b, m) => (!b || m.net > b.net ? m : b), null);
        const avg = months.length ? months.reduce((acc, m) => acc + Math.round(m.net * 100), 0) / months.length / 100 : 0;
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-subtle">Period shown: {formatDate(data.range?.from)} – {formatDate(data.range?.to)}{!range.from ? ' (12 months ending with the end date)' : ''}</p>
              <Button onClick={download} disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4 mr-2" aria-hidden="true" />}
                Download report (CSV)
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Net revenue in period" value={inr(data.totals.net_revenue)} tone="primary" />
              <StatCard label="Average per month" value={inr(avg)} hint={`${formatNumber(months.length)} months`} />
              <StatCard label="Best month" value={best ? monthLabel(best.month) : '—'} hint={best ? inr(best.net) : ''} tone="positive" />
              <StatCard label="Platform earnings" value={inr(data.totals.platform_earnings)} />
            </div>

            <Card className="shadow-sm border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Monthly performance</CardTitle>
                <CardDescription>Gross collected and refunds per month (India time), with net revenue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!hasData ? (
                  <EmptyRows title="No payments in this period" />
                ) : (
                  <div role="img" aria-label={`Monthly net revenue: ${months.map((m) => `${m.label} ${inr(m.net)}`).join(', ')}`} className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={months} margin={{ left: 16, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(v) => inr(v)} width={90} />
                        <Tooltip formatter={(v) => inr(v)} />
                        <Legend />
                        <Bar dataKey="gross" name="Gross collected" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="refunds" name="Refunds" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="net" name="Net revenue" stroke="hsl(var(--chart-4))" strokeWidth={2} dot />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <DataTable caption="Monthly performance" head={['Month', 'Payments', 'New', 'Renewals', 'Gross', 'Refunds', 'Net', 'Platform plans', 'Advisor plans', 'Failed', 'Pending', 'Abandoned']}>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <th scope="row" className="px-4 py-3 font-medium whitespace-nowrap">{m.label}</th>
                      <td className="px-4 py-3">{formatNumber(m.transactions)}</td>
                      <td className="px-4 py-3">{formatNumber(m.new_count)}</td>
                      <td className="px-4 py-3">{formatNumber(m.renewal_count)}</td>
                      <td className="px-4 py-3">{inr(m.gross)}</td>
                      <td className="px-4 py-3 text-sell">{inr(m.refunds)}</td>
                      <td className="px-4 py-3 font-semibold">{inr(m.net)}</td>
                      <td className="px-4 py-3">{inr(m.platform_net)}</td>
                      <td className="px-4 py-3">{inr(m.advisor_net)}</td>
                      <td className="px-4 py-3">{formatNumber(m.failed)}</td>
                      <td className="px-4 py-3">{formatNumber(m.pending)}</td>
                      <td className="px-4 py-3">{formatNumber(m.abandoned)}</td>
                    </tr>
                  ))}
                </DataTable>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="shadow-sm border bg-white">
                <CardHeader><CardTitle className="text-lg">Transaction summary</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {Object.keys(data.status_summary).length === 0 ? <EmptyRows title="No transactions in this period" /> : (
                    <DataTable caption="Transactions by status" head={['Status', 'Count', 'Amount']}>
                      {Object.entries(data.status_summary).map(([k, s]) => (
                        <tr key={k}>
                          <th scope="row" className="px-4 py-3 font-medium">{k === 'refund' ? 'Refunds issued' : k === 'refund_failed' ? 'Refunds failed at Razorpay' : (STATUS_LABELS[k] || k)}</th>
                          <td className="px-4 py-3">{formatNumber(s.count)}</td>
                          <td className="px-4 py-3">{inr(s.amount)}</td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-sm border bg-white">
                <CardHeader><CardTitle className="text-lg">Revenue breakdown</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <DataTable caption="Revenue breakdown by source" head={['Source', 'Gross', 'Refunds', 'Net']}>
                    {sourceRows(data.breakdown).map((r) => (
                      <tr key={r.key}>
                        <th scope="row" className="px-4 py-3 font-medium">{r.label}</th>
                        <td className="px-4 py-3">{inr(r.gross ?? 0)}</td>
                        <td className="px-4 py-3 text-sell">{inr(r.refunds ?? 0)}</td>
                        <td className="px-4 py-3 font-semibold">{inr(r.net ?? 0)}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="px-4 py-3 font-medium">Other recorded income</th>
                      <td className="px-4 py-3">{inr(data.totals.other_income)}</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 font-semibold">{inr(data.totals.other_income)}</td>
                    </tr>
                  </DataTable>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }}
    </DataView>
  );
}

Reports.propTypes = {
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
};
