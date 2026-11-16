import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandCoins, Eye } from 'lucide-react';
import { PayoutRequest, FinInfluencer } from '@/api/entities';
import { normalizePayout, payoutAmount } from '@/lib/payoutView';
import { formatDate } from '@/lib/format';
import PayoutDetailsModal from './PayoutDetailsModal';
import { DataView, useFinanceData, inr, DataTable, EmptyRows, StatusBadge } from './shared';

/**
 * Creator (non-advisor) payout requests. Advisor withdrawals have their own tab
 * (bank details, state machine); the server refuses to change them from here.
 *
 * The old "Payout Analytics" sub-tab summed enrollment and commission fields
 * that do not exist in the database (always ₹0); per-advisor earnings and
 * payouts now live in Advisor Revenue, computed on the server.
 */
export default function Payouts() {
  const [selected, setSelected] = useState(null);
  const query = useFinanceData(async () => {
    const [payouts, creators] = await Promise.all([PayoutRequest.list(), FinInfluencer.list().catch(() => [])]);
    return { payouts: Array.isArray(payouts) ? payouts : [], creators: Array.isArray(creators) ? creators : [] };
  }, []);

  const rows = useMemo(() => {
    const data = query.data;
    if (!data) return [];
    const names = new Map(data.creators.map((c) => [c.id, c.display_name]));
    return data.payouts
      .filter((p) => p.entity_type !== 'advisor')
      .filter((p) => p.status === 'pending' || p.status === 'approved')
      .map((p) => ({ ...normalizePayout(p), creatorName: names.get(p.entity_id) || null }));
  }, [query.data]);

  return (
    <Card className="shadow-sm border bg-white">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><HandCoins className="w-5 h-5 text-primary" aria-hidden="true" /> Creator payout requests</CardTitle>
        <CardDescription>Pending and approved payout requests from finfluencers and other creators. Advisor withdrawals are reviewed in the Advisor Withdrawals tab.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <DataView query={query} loadingLabel="Loading payout requests…">
          {() => (rows.length === 0 ? <EmptyRows title="No pending payout requests" /> : (
            <DataTable caption="Creator payout requests" head={['Creator', 'Amount', 'Method', 'Requested', 'Status', 'Action']}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{r.creatorName || 'Unknown creator'}</td>
                  <td className="px-4 py-3 font-semibold">{inr(payoutAmount(r))}</td>
                  <td className="px-4 py-3 capitalize">{String(r.payout_method || '—').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{formatDate(r.created_date || r.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status === 'approved' ? 'processing' : 'pending'} label={r.status} /></td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => setSelected({ ...r, userName: r.creatorName || 'Unknown creator' })}>
                      <Eye className="w-4 h-4 mr-1" aria-hidden="true" /> Review
                    </Button>
                  </td>
                </tr>
              ))}
            </DataTable>
          ))}
        </DataView>
      </CardContent>
      <PayoutDetailsModal request={selected} isOpen={Boolean(selected)} onClose={() => setSelected(null)} onUpdate={query.reload} />
    </Card>
  );
}
