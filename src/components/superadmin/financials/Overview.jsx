import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PropTypes from 'prop-types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { IndianRupee, RotateCcw, TrendingUp, Wallet, Users, Percent } from 'lucide-react';
import { financialsApi, TIER_LABELS } from '@/lib/financialsApi';
import { formatNumber } from '@/lib/format';
import { DataView, StatCard, useFinanceData, inr, DataTable } from './shared';

/** Rows of the "revenue by source" table/chart, from the server breakdown. */
export function sourceRows(breakdown) {
  const tiers = breakdown?.platform_subscriptions?.tiers || {};
  return [
    ...['basic', 'premium', 'vip', 'other'].map((t) => ({ key: t, label: `Platform: ${TIER_LABELS[t]}`, ...(tiers[t] || {}) })),
    { key: 'advisor', label: 'Advisor subscriptions', ...(breakdown?.advisor_subscriptions || {}) },
    { key: 'other_src', label: 'Other gateway payments', ...(breakdown?.other || {}) },
  ];
}

export default function Overview({ range }) {
  const query = useFinanceData(() => financialsApi.overview(range), [range.from, range.to]);
  return (
    <DataView query={query}>
      {(data) => {
        const t = data.totals;
        const rows = sourceRows(data.breakdown);
        const chartData = rows.filter((r) => (r.gross || 0) > 0 || (r.refunds || 0) > 0).map((r) => ({ name: r.label, net: r.net || 0 }));
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Total platform revenue" value={inr(t.total_revenue)} hint="Net gateway revenue + other recorded income" tone="primary" icon={IndianRupee} />
              <StatCard label="Gross collected" value={inr(t.gross_collected)} hint={`${formatNumber(data.counts.success)} captured payments`} icon={TrendingUp} />
              <StatCard label="Refunds" value={inr(t.refunds)} hint={`${formatNumber(data.counts.refunds)} refunds`} tone="negative" icon={RotateCcw} />
              <StatCard label="Net revenue" value={inr(t.net_revenue)} hint="Gross collected − refunds" tone="positive" icon={Wallet} />
              <StatCard label="Platform earnings" value={inr(t.platform_earnings)} hint="Platform plans net + commission on advisor plans" icon={Percent} />
              <StatCard label="Advisor earnings" value={inr(t.advisor_earnings)} hint="Advisors' share of their subscriptions" icon={Users} />
              <StatCard label="Other recorded income" value={inr(t.other_income)} hint="Entered by finance staff, not gateway-verified" />
              <StatCard label="Promo discounts given" value={inr(t.discounts_given)} hint={`${formatNumber(t.free_activations)} free (100%) activations`} tone="caution" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Pending payments" value={formatNumber(data.counts.pending)} hint={data.attempts_recorded ? 'Checkout opened in the last 24 hours, not paid yet' : 'Attempt tracking starts after migration 021'} tone="caution" />
              <StatCard label="Abandoned checkouts" value={formatNumber(data.counts.abandoned)} hint="Unpaid for more than 24 hours" />
              <StatCard label="Failed payments" value={formatNumber(data.counts.failed)} hint="Reported failed by Razorpay" tone="negative" />
            </div>

            <Card className="shadow-sm border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Revenue by source</CardTitle>
                <CardDescription>Net = gross collected − refunds, for the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {chartData.length > 0 && (
                  <div role="img" aria-label={`Net revenue by source: ${chartData.map((c) => `${c.name} ${inr(c.net)}`).join(', ')}`} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                        <XAxis type="number" tickFormatter={(v) => inr(v)} />
                        <YAxis type="category" dataKey="name" width={170} />
                        <Tooltip formatter={(v) => inr(v)} />
                        <Bar dataKey="net" name="Net revenue" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <DataTable caption="Revenue by source" head={['Source', 'Payments', 'Gross', 'Refunds', 'Net']}>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <th scope="row" className="px-4 py-3 font-medium text-foreground">{r.label}</th>
                      <td className="px-4 py-3">{formatNumber(r.transactions ?? 0)}</td>
                      <td className="px-4 py-3">{inr(r.gross ?? 0)}</td>
                      <td className="px-4 py-3 text-sell">{inr(r.refunds ?? 0)}</td>
                      <td className="px-4 py-3 font-semibold">{inr(r.net ?? 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-2">
                    <th scope="row" className="px-4 py-3 font-semibold">All gateway payments</th>
                    <td className="px-4 py-3">{formatNumber(data.counts.success)}</td>
                    <td className="px-4 py-3">{inr(t.gross_collected)}</td>
                    <td className="px-4 py-3 text-sell">{inr(t.refunds)}</td>
                    <td className="px-4 py-3 font-semibold">{inr(t.net_revenue)}</td>
                  </tr>
                </DataTable>
              </CardContent>
            </Card>
          </div>
        );
      }}
    </DataView>
  );
}

Overview.propTypes = {
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
};
