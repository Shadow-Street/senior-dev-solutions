import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-surface-2 text-foreground' },
  pending_payment: { label: 'Pending Payment', color: 'bg-hold-muted text-hold-muted-foreground' },
  paid: { label: 'Paid', color: 'bg-premium-muted text-protocall-blue' },
  ready_for_execution: { label: 'Ready for Execution', color: 'bg-premium-muted text-protocall-blue' },
  executing: { label: 'Executing', color: 'bg-premium-muted text-protocall-premium-text animate-pulse' },
  executed: { label: 'Executed', color: 'bg-buy-muted text-buy-muted-foreground' },
  failed: { label: 'Failed', color: 'bg-sell-muted text-sell-muted-foreground' },
  cancelled: { label: 'Cancelled', color: 'bg-sell-muted text-sell-muted-foreground' },
};

export default function MyPledgesTab({ pledges, sessions }) {
  if (!pledges || pledges.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Pledges Yet</h3>
          <p className="text-subtle">You haven't made any pledges. Active sessions will appear in the "Active Sessions" tab.</p>
        </CardContent>
      </Card>
    );
  }

  const sessionsMap = new Map(sessions.map(s => [s.id, s]));

  return (
    <div className="space-y-4">
      {pledges.map(pledge => {
        const session = sessionsMap.get(pledge.session_id);
        const pledgeStatus = statusConfig[pledge.status] || { label: pledge.status, color: 'bg-surface-2' };

        return (
          <Card key={pledge.id} className="bg-white shadow-md border-0 rounded-xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-xl font-bold">{pledge.stock_symbol}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {session ? `Session ends: ${new Date(session.session_end).toLocaleDateString()}` : 'Session details unavailable'}
                </p>
              </div>
              <Badge className={`${pledgeStatus.color} text-xs font-semibold px-3 py-1`}>{pledgeStatus.label}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">SIDE</p>
                  <p className={`font-bold text-lg ${pledge.side === 'buy' ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}`}>
                    {pledge.side.toUpperCase()}
                  </p>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">QUANTITY</p>
                  <p className="font-bold text-lg">{pledge.qty}</p>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">TARGET PRICE</p>
                  <p className="font-bold text-lg">₹{pledge.price_target.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground font-semibold">TOTAL VALUE</p>
                  <p className="font-bold text-lg">₹{(pledge.qty * pledge.price_target).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}