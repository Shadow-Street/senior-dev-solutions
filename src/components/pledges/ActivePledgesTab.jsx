
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, CreditCard, CheckCircle, Zap } from 'lucide-react'; // Removed IndianRupee, RefreshCw
import LiveActivityBadge from './LiveActivityBadge'; // New import

const ActivePledgesTab = ({ sessions, pledges, stockPrices, onPledge, onPay, onRefresh }) => {
  const sessionStatusConfig = {
    active: { label: 'Pledging Open', color: 'bg-buy-muted text-buy-muted-foreground' },
    closed: { label: 'Pledging Closed', color: 'bg-hold-muted text-hold-muted-foreground' },
    executing: { label: 'Executing...', color: 'bg-premium-muted text-protocall-blue animate-pulse' },
    awaiting_sell_execution: { label: 'Buy Order Executed', color: 'bg-premium-muted text-protocall-blue font-semibold' },
    completed: { label: 'Completed', color: 'bg-surface-2 text-foreground' },
    cancelled: { label: 'Cancelled', color: 'bg-sell-muted text-sell-muted-foreground' },
  };

  const getPledgeForSession = (sessionId) => {
    return pledges.find(p => p.session_id === sessionId);
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-subtle mb-2">No active sessions</h3>
        <p className="text-muted-foreground">There are no active pledging sessions at the moment.</p>
        <p className="text-muted-foreground">New sessions will appear here when they are available.</p>
        {onRefresh && (
          <Button onClick={onRefresh} className="mt-6">
            Refresh Sessions
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.map((session) => {
        const userPledge = getPledgeForSession(session.id);
        const stockPrice = stockPrices[session.stock_symbol];
        const sessionStatus = sessionStatusConfig[session.status] || { label: session.status, color: 'bg-surface-2' };

        return (
          <Card key={session.id} className="overflow-hidden shadow-lg border-0 bg-white rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 bg-surface-2 border-b rounded-t-xl">
              <div className="flex flex-col">
                <CardTitle className="text-2xl font-bold text-foreground">{session.stock_symbol}</CardTitle>
                <p className="text-sm text-subtle font-medium">
                  {session.side?.toUpperCase()} • {session.qty} shares @ ₹{session.price_target}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {session.status !== 'completed' && session.status !== 'cancelled' && (
                  <LiveActivityBadge status={session.status} />
                )}
                <Badge className={`${sessionStatus.color} text-xs font-semibold border-0 px-3 py-1`}>
                  {sessionStatus.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Target Price</p>
                  <p className="text-base font-semibold text-foreground">₹{session.price_target}</p>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <p className="text-base font-semibold text-foreground">
                    {stockPrice ? `₹${stockPrice.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-base font-semibold text-foreground">{session.qty}</p>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pledge Value</p>
                  <p className="text-base font-semibold text-foreground">₹{(session.qty * session.price_target).toLocaleString()}</p>
                </div>
              </div>

              {session.status === 'awaiting_sell_execution' && (
                <div className="mt-4 text-sm text-protocall-blue p-3 bg-premium-muted rounded-lg border border-protocall-premium-light">
                  <p className="font-semibold">Your buy order for this pledge is complete.</p>
                  <p className="text-xs mt-1">The sell order will be executed by the admin based on market conditions. Monitor the 'Executed' tab for final P/L results once the cycle is finished.</p>
                </div>
              )}

              {userPledge ? (
                <div className="mt-4">
                  <div className="bg-surface-2 p-4 rounded-lg border">
                    <h4 className="text-lg font-semibold text-foreground mb-3">Your Pledge Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-subtle">Pledge Value:</span>
                        <span className="font-semibold text-foreground">₹{(userPledge.qty * userPledge.price_target).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-subtle">Convenience Fee:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">₹{userPledge.convenience_fee_amount || 25}</span>
                          {userPledge.convenience_fee_paid ? (
                            <Badge className="bg-buy-soft text-buy-foreground text-xs font-semibold border-0 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-semibold bg-hold-muted text-hold-muted-foreground border-hold/30">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!userPledge.convenience_fee_paid && (
                        <Button
                          onClick={() => onPay(userPledge.id)}
                          className="w-full mt-4 bg-buy-soft hover:from-buy hover:to-buy text-buy-foreground shadow-md flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay ₹{userPledge.convenience_fee_amount || 25} Fee
                        </Button>
                      )}
                      {userPledge.convenience_fee_paid && (
                        <Button disabled className="w-full mt-4 bg-gradient-to-r from-protocall-deep to-protocall-blue text-white opacity-80 shadow-md flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Pledged & Ready
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : session.status === 'active' ? (
                <div className="mt-6 flex justify-center">
                  <Button onClick={() => onPledge(session)} className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl">
                    <Zap className="w-4 h-4 mr-2" />
                    Place Your Pledge
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ActivePledgesTab;
