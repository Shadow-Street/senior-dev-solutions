import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PropTypes from 'prop-types';
import { IndianRupee, Percent, Users, HandCoins } from 'lucide-react';
import { financialsApi } from '@/lib/financialsApi';
import { formatNumber } from '@/lib/format';
import { DataView, StatCard, useFinanceData, inr, DataTable, EmptyRows } from './shared';

export default function AdvisorRevenue({ range }) {
  const query = useFinanceData(() => financialsApi.advisorRevenue(range), [range.from, range.to]);
  return (
    <DataView query={query}>
      {(data) => {
        const t = data.totals;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Advisor subscription revenue" value={inr(t.gross)} hint={`${formatNumber(t.transactions)} payments · net ${inr(t.net)}`} tone="primary" icon={IndianRupee} />
              <StatCard label="Platform commission" value={inr(t.platform_commission)} icon={Percent} />
              <StatCard label="Advisor earnings" value={inr(t.advisor_earnings)} icon={Users} />
              <StatCard label="Paid out to advisors" value={inr(t.payouts_paid)} hint={`${inr(t.payouts_open)} in open withdrawal requests`} icon={HandCoins} />
            </div>
            {t.unsplit_gross > 0 && (
              <p role="alert" className="text-sm text-hold-muted-foreground bg-hold-muted rounded-lg p-3">
                {inr(t.unsplit_gross)} of advisor payments has no commission record yet, so it is not in the commission or earnings figures. Check Reconciliation and the advisor commission queue.
              </p>
            )}
            <Card className="shadow-sm border bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Per advisor</CardTitle>
                <CardDescription>
                  Gross and refunds are advisor-plan payments in the period. Commission is split from each payment
                  at the platform rate when it was made; cancelled commissions (refunded payments) are excluded.
                  Paid out is withdrawals paid in the period; open is pending or approved withdrawals now.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.advisors.length === 0 ? (
                  <EmptyRows title="No advisor revenue in this period" description="Advisor plan payments will appear here once subscribers pay." />
                ) : (
                  <DataTable caption="Advisor revenue per advisor" head={['Advisor', 'Payments', 'Gross', 'Refunds', 'Platform commission', 'Advisor earnings', 'Commission status', 'Paid out', 'Open withdrawals']}>
                    {data.advisors.map((a) => (
                      <tr key={a.advisor_id}>
                        <th scope="row" className="px-4 py-3 font-medium text-foreground">{a.advisor_name || 'Unnamed advisor'}</th>
                        <td className="px-4 py-3">{formatNumber(a.transactions)}</td>
                        <td className="px-4 py-3">{inr(a.gross)}</td>
                        <td className="px-4 py-3 text-sell">{inr(a.refunds)}</td>
                        <td className="px-4 py-3">{inr(a.platform_commission)}</td>
                        <td className="px-4 py-3 font-semibold">{inr(a.advisor_earnings)}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="block">Pending {inr(a.commission_pending)}</span>
                          <span className="block">Approved {inr(a.commission_approved)}</span>
                          <span className="block">Paid {inr(a.commission_paid)}</span>
                        </td>
                        <td className="px-4 py-3">{inr(a.payouts_paid)}</td>
                        <td className="px-4 py-3">{inr(a.payouts_open)}</td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }}
    </DataView>
  );
}

AdvisorRevenue.propTypes = {
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
};
