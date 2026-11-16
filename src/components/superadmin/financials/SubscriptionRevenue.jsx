import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PropTypes from 'prop-types';
import { CreditCard, Repeat, Users, IndianRupee } from 'lucide-react';
import { financialsApi, TIER_LABELS } from '@/lib/financialsApi';
import { formatNumber } from '@/lib/format';
import { DataView, StatCard, useFinanceData, inr, DataTable } from './shared';

const TIERS = ['basic', 'premium', 'vip', 'other'];

export default function SubscriptionRevenue({ range }) {
  const query = useFinanceData(() => financialsApi.subscriptionRevenue(range), [range.from, range.to]);
  return (
    <DataView query={query}>
      {(data) => {
        const { tiers, totals } = data;
        const sum = (k) => TIERS.reduce((acc, t) => acc + (Number(tiers[t]?.[k]) || 0), 0);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Platform MRR" value={inr(totals.mrr)} hint="Live paid plans, annual ÷ 12" tone="primary" icon={IndianRupee} />
              <StatCard label="Active subscribers" value={formatNumber(totals.active_subscribers)} hint={`${formatNumber(totals.paid_active_subscribers)} on Premium or VIP`} icon={Users} />
              <StatCard label="New subscriptions" value={formatNumber(sum('new_count'))} hint="Paid, in the period" icon={CreditCard} />
              <StatCard label="Renewals" value={formatNumber(sum('renewal_count'))} hint="Paid, in the period" icon={Repeat} />
            </div>

            <Card className="shadow-sm border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Basic, Premium and VIP</CardTitle>
                <CardDescription>
                  Revenue and transactions are for the selected period; subscribers and MRR are as of now.
                  A renewal is a paid charge from a customer who had already paid for the same tier.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable caption="Subscription revenue by tier" head={['Tier', 'Transactions', 'New', 'Renewals', 'Gross', 'Refunds', 'Net', 'Active subscribers', 'MRR']}>
                  {TIERS.map((t) => {
                    const r = tiers[t] || {};
                    return (
                      <tr key={t}>
                        <th scope="row" className="px-4 py-3 font-medium text-foreground">{TIER_LABELS[t]}</th>
                        <td className="px-4 py-3">{formatNumber(r.transactions)}{r.free_activations ? <span className="block text-xs text-muted-foreground">+{formatNumber(r.free_activations)} free promo</span> : null}</td>
                        <td className="px-4 py-3">{formatNumber(r.new_count)}<span className="block text-xs text-muted-foreground">{inr(r.new_revenue)}</span></td>
                        <td className="px-4 py-3">{formatNumber(r.renewal_count)}<span className="block text-xs text-muted-foreground">{inr(r.renewal_revenue)}</span></td>
                        <td className="px-4 py-3">{inr(r.gross)}</td>
                        <td className="px-4 py-3 text-sell">{inr(r.refunds)}</td>
                        <td className="px-4 py-3 font-semibold">{inr(r.net)}</td>
                        <td className="px-4 py-3">{formatNumber(r.active_subscribers)}</td>
                        <td className="px-4 py-3">{inr(r.mrr)}</td>
                      </tr>
                    );
                  })}
                </DataTable>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard label="Advisor plan MRR" value={inr(totals.advisor_mrr)} hint="See Advisor Revenue for the per-advisor split" />
              <StatCard label="Active advisor subscriptions" value={formatNumber(totals.advisor_active_subscriptions)} />
            </div>
          </div>
        );
      }}
    </DataView>
  );
}

SubscriptionRevenue.propTypes = {
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
};
