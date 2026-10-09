import React, { useState, useEffect } from 'react';
import { AdvisorPledgeCommission, PayoutRequest } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Wallet, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PayoutRequestModal from '../../entity/PayoutRequestModal';
import FinancialStatement from '../../entity/FinancialStatement';
import { format } from 'date-fns';

export default function AdvisorPledgeFinancials({ user, advisorProfile, accessRequest }) {
  const [financialTab, setFinancialTab] = useState('overview');
  const [showPayoutRequest, setShowPayoutRequest] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    platformCommission: 0,
    netEarnings: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    availableBalance: 0
  });

  useEffect(() => {
    loadFinancialData();
  }, [advisorProfile?.id]);

  const loadFinancialData = async () => {
    if (!advisorProfile?.id) return;

    try {
      setIsLoading(true);
      const commissions = await AdvisorPledgeCommission.filter({
        advisor_id: advisorProfile.id
      });

      const payouts = await PayoutRequest.filter({
        entity_id: advisorProfile.id,
        entity_type: 'advisor'
      });

      setPayoutRequests(payouts);

      const totalEarnings = commissions.reduce((sum, c) => sum + (c.total_execution_value || 0), 0);
      const platformCommission = commissions.reduce((sum, c) => sum + (c.platform_commission_amount || 0), 0);
      const netEarnings = commissions.reduce((sum, c) => sum + (c.advisor_commission_amount || 0), 0);
      const totalPaidOut = payouts
        .filter(p => p.status === 'processed')
        .reduce((sum, p) => sum + (p.requested_amount || 0), 0);
      const pendingPayouts = payouts
        .filter(p => ['pending', 'approved'].includes(p.status))
        .reduce((sum, p) => sum + (p.requested_amount || 0), 0);

      const balance = netEarnings - totalPaidOut - pendingPayouts;

      setStats({
        totalEarnings,
        platformCommission,
        netEarnings,
        totalPayouts: totalPaidOut,
        pendingPayouts,
        availableBalance: Math.max(0, balance)
      });

      setAvailableBalance(Math.max(0, balance));
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayoutSubmit = async (payoutData) => {
    try {
      await PayoutRequest.create({
        user_id: user.id,
        entity_type: 'advisor',
        entity_id: advisorProfile.id,
        requested_amount: payoutData.requested_amount,
        available_balance: availableBalance,
        payout_method: payoutData.payout_method,
        bank_details: payoutData.bank_details,
        upi_id: payoutData.upi_id,
        paypal_email: payoutData.paypal_email,
        status: 'pending'
      });

      toast.success('Payout request submitted successfully!');
      setShowPayoutRequest(false);
      loadFinancialData();
    } catch (error) {
      console.error('Error submitting payout request:', error);
      toast.error('Failed to submit payout request');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Pending' },
      approved: { color: 'bg-premium-muted text-primary', label: 'Approved' },
      processed: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Processed' },
      rejected: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Rejected' }
    };
    const { color, label } = config[status] || config.pending;
    return <span className={`px-2 py-1 text-xs rounded-full font-semibold ${color}`}>{label}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-Navigation with Full Rounded Buttons */}
      <div className="flex gap-3 w-full">
        <Button
          onClick={() => setFinancialTab('overview')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'overview'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <DollarSign className="w-5 h-5 mr-2 inline-block" />
          Financials
        </Button>
        <Button
          onClick={() => setFinancialTab('payouts')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'payouts'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <Wallet className="w-5 h-5 mr-2 inline-block" />
          Payout Requests
        </Button>
        <Button
          onClick={() => setFinancialTab('refunds')}
          className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${financialTab === 'refunds'
            ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-surface-2 text-subtle hover:from-surface-2 hover:to-surface-2 hover:shadow-md border border-protocall-premium-light'
            }`}
        >
          <TrendingUp className="w-5 h-5 mr-2 inline-block" />
          Refund Management
        </Button>
      </div>

      {financialTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">Financial Overview</h2>
            <Button
              onClick={() => setShowPayoutRequest(true)}
              disabled={availableBalance <= 0}
              className="bg-buy text-buy-foreground hover:bg-buy-soft"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Request Payout
            </Button>
          </div>

          <FinancialStatement
            entityType="advisor"
            entityId={advisorProfile?.id}
            entityName={advisorProfile?.display_name || 'Advisor'}
          />
        </div>
      )}

      {financialTab === 'payouts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">Payout Requests</h2>
            <Button
              onClick={() => setShowPayoutRequest(true)}
              disabled={availableBalance <= 0}
              className="bg-buy text-buy-foreground hover:bg-buy-soft"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Request Payout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wallet className="w-8 h-8 text-buy-muted-foreground" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-subtle">Available Balance</p>
                    <p className="text-2xl font-bold text-foreground">₹{stats.availableBalance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-hold-muted-foreground" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-subtle">Pending Payouts</p>
                    <p className="text-2xl font-bold text-foreground">₹{stats.pendingPayouts.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-subtle">Total Earned</p>
                    <p className="text-2xl font-bold text-foreground">₹{stats.netEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {payoutRequests.length > 0 ? (
              payoutRequests.map(payout => (
                <Card key={payout.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">₹{payout.requested_amount.toLocaleString()}</p>
                        <p className="text-sm text-subtle">{format(new Date(payout.created_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{payout.payout_method}</p>
                      </div>
                      {getStatusBadge(payout.status)}
                    </div>
                    {payout.admin_notes && (
                      <p className="text-sm text-subtle mt-2">Admin Notes: {payout.admin_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-subtle">No payout requests yet.</p>
                  {stats.availableBalance > 0 && (
                    <Button onClick={() => setShowPayoutRequest(true)} className="mt-4 bg-buy text-buy-foreground hover:bg-buy-soft">
                      Request Your First Payout
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {financialTab === 'refunds' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Refund Management</h2>
          <Card>
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-subtle">No refund requests for pledge trading</p>
              <p className="text-sm text-muted-foreground mt-2">Pledge trading refunds are managed through the convenience fee system</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showPayoutRequest && (
        <PayoutRequestModal
          open={showPayoutRequest}
          onClose={() => setShowPayoutRequest(false)}
          onSubmit={handlePayoutSubmit}
          availableBalance={availableBalance}
          entityType="advisor"
        />
      )}
    </div>
  );
}
