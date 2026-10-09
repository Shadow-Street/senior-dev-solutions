
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FundTransaction, Investor, FundPlan } from '@/api/entities';
import { toast } from 'sonner';
import { Loader2, Activity } from 'lucide-react';

export default function TransactionsManager({ onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [investors, setInvestors] = useState({});
  const [fundPlans, setFundPlans] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txns, invs, plans] = await Promise.all([
        FundTransaction.list('-transaction_date'),
        Investor.list(),
        FundPlan.list(),
      ]);

      const invMap = invs.reduce((acc, inv) => ({ ...acc, [inv.id]: inv }), {});
      const planMap = plans.reduce((acc, plan) => ({ ...acc, [plan.id]: plan }), {});

      setTransactions(txns);
      setInvestors(invMap);
      setFundPlans(planMap);

    } catch (error) {
      toast.error('Failed to load transactions: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status) => {
    const colors = {
      completed: 'bg-buy-muted text-buy-muted-foreground',
      pending: 'bg-hold-muted text-hold-muted-foreground',
      failed: 'bg-sell-muted text-sell-muted-foreground',
      cancelled: 'bg-surface-2 text-foreground',
      processing: 'bg-premium-muted text-primary',
    };
    return <Badge className={colors[status] || 'bg-surface-2'}>{status}</Badge>;
  };
  
  const getTypeBadge = (type) => {
    const colors = {
      wallet_deposit: 'bg-premium-muted text-primary',
      purchase: 'bg-buy-muted text-buy-muted-foreground',
      redemption: 'bg-hold-muted text-hold-muted-foreground',
      profit_payout: 'bg-premium-muted text-protocall-premium-text',
      wallet_withdrawal: 'bg-sell-muted text-sell-muted-foreground',
      management_fee: 'bg-surface-2 text-foreground',
    };
    return <Badge className={`${colors[type] || 'bg-surface-2'} capitalize`}>{type.replace(/_/g, ' ')}</Badge>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="ml-4">Loading Transactions...</p></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-subtle" />
            All Fund Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-subtle uppercase bg-surface-2">
                <tr>
                  <th scope="col" className="px-6 py-3">Date</th>
                  <th scope="col" className="px-6 py-3">Investor</th>
                  <th scope="col" className="px-6 py-3">Type</th>
                  <th scope="col" className="px-6 py-3 text-right">Amount</th>
                  <th scope="col" className="px-6 py-3">Fund/Notes</th>
                  <th scope="col" className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map(txn => {
                    const investor = investors[txn.investor_id];
                    const plan = fundPlans[txn.fund_plan_id];
                    return (
                      <tr key={txn.id} className="bg-white border-b hover:bg-surface-2">
                        <td className="px-6 py-4">{new Date(txn.transaction_date).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium">
                          {investor ? (
                            <div>
                                <p>{investor.full_name}</p>
                                <p className="text-xs text-muted-foreground">{investor.investor_code}</p>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">{getTypeBadge(txn.transaction_type)}</td>
                        <td className="px-6 py-4 text-right font-semibold">₹{txn.amount?.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                            {plan ? plan.plan_name : (txn.notes || 'Wallet Transaction')}
                        </td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(txn.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
