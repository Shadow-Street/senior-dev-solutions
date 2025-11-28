
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function AdvisorCommissionTracker({ user, advisorProfile }) {
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingPayouts: 0,
    processedPayouts: 0,
    commissionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadCommissions = async () => {
      if (!advisorProfile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const [commissionsData, accessRequest] = await Promise.all([
          base44.entities.AdvisorPledgeCommission.filter({ advisor_id: advisorProfile.id }, { signal: abortController.signal }).catch(() => []),
          base44.entities.AdvisorPledgeAccessRequest.filter({ 
            advisor_id: advisorProfile.id, 
            status: 'approved' 
          }, '-created_date', 1, { signal: abortController.signal }).catch(() => [])
        ]);

        if (!isMounted || abortController.signal.aborted) return;

        setCommissions(commissionsData);

        const totalEarned = commissionsData.reduce((sum, c) => sum + (c.advisor_commission_amount || 0), 0);
        const pending = commissionsData.filter(c => c.payout_status === 'pending').reduce((sum, c) => sum + c.advisor_commission_amount, 0);
        const processed = commissionsData.filter(c => c.payout_status === 'processed').reduce((sum, c) => sum + c.advisor_commission_amount, 0);

        if (isMounted && !abortController.signal.aborted) {
          setStats({
            totalEarned,
            pendingPayouts: pending,
            processedPayouts: processed,
            commissionRate: accessRequest[0]?.approved_commission_rate || 0
          });
        }
      } catch (error) {
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error('Error loading commissions:', error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadCommissions();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [advisorProfile?.id]);

  const getStatusBadge = (status) => {
    const config = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      'processed': { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Processed' },
      'failed': { color: 'bg-red-100 text-red-800', icon: Clock, text: 'Failed' }
    };
    const { color, icon: Icon, text } = config[status] || config['pending'];
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Commission Tracker</h2>
        <Badge className="bg-purple-100 text-purple-800 px-4 py-2 text-base">
          Your Rate: {stats.commissionRate}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarned.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.pendingPayouts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.processedPayouts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No commission records yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Once your pledge sessions are executed, commission will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold">{commission.stock_symbol}</p>
                      {getStatusBadge(commission.payout_status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {commission.commission_type === 'convenience_fee' && 'Convenience Fee Commission'}
                      {commission.commission_type === 'trading_profit' && 'Trading Profit Commission'}
                      {commission.commission_type === 'both' && 'Combined Commission'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Execution Value: ₹{(commission.total_execution_value || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      +₹{commission.advisor_commission_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(commission.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
