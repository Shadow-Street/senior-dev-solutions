import React, { useState, useEffect } from 'react';
import apiClient from '@/api/Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Target, BarChart3, Clock, CheckCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdvisorPledgeOverview({ user, advisorProfile, accessRequest }) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalPledges: 0,
    totalPledgeValue: 0,
    totalExecutions: 0,
    totalExecutionValue: 0,
    totalCommission: 0,
    pendingPayouts: 0,
    commissionRate: 0
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadOverviewData = async () => {
      if (!advisorProfile?.id) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const [sessions, commissions] = await Promise.all([
          base44.entities.PledgeSession.filter({
            created_by_advisor_id: advisorProfile.id
          }, '-created_date', 10).catch(() => []),
          base44.entities.AdvisorPledgeCommission.filter({
            advisor_id: advisorProfile.id
          }, '-created_date', 5).catch(() => [])
        ]);

        if (!isMounted || abortController.signal.aborted) return;

        const activeSessions = sessions.filter(s => ['active', 'approved', 'executing'].includes(s.status));
        const totalPledges = sessions.reduce((sum, s) => sum + (s.total_pledges || 0), 0);
        const totalPledgeValue = sessions.reduce((sum, s) => sum + (s.total_pledge_value || 0), 0);

        const allExecutions = await base44.entities.PledgeExecutionRecord.list().catch(() => []);
        if (!isMounted || abortController.signal.aborted) return;

        const sessionIds = sessions.map(s => s.id);
        const executions = allExecutions.filter(e => sessionIds.includes(e.session_id));
        const totalExecutionValue = executions.reduce((sum, e) => sum + (e.total_execution_value || 0), 0);

        const totalCommission = commissions.reduce((sum, c) => sum + (c.advisor_commission_amount || 0), 0);
        const pendingPayouts = commissions
          .filter(c => c.payout_status === 'pending')
          .reduce((sum, c) => sum + c.advisor_commission_amount, 0);

        if (isMounted && !abortController.signal.aborted) {
          setStats({
            totalSessions: sessions.length,
            activeSessions: activeSessions.length,
            totalPledges,
            totalPledgeValue,
            totalExecutions: executions.length,
            totalExecutionValue,
            totalCommission,
            pendingPayouts,
            commissionRate: accessRequest?.approved_commission_rate || 0
          });
          setRecentSessions(sessions.slice(0, 5));
          setRecentCommissions(commissions);
        }
      } catch (error) {
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error('Error loading overview data:', error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadOverviewData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [advisorProfile?.id, accessRequest]);

  const getStatusColor = (status) => {
    const colors = {
      'pending_approval': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-blue-100 text-blue-800',
      'active': 'bg-green-100 text-green-800',
      'executing': 'bg-purple-100 text-purple-800',
      'completed': 'bg-gray-100 text-gray-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pledge Management Overview</h2>
          <p className="text-gray-600 mt-1">Your pledge trading performance at a glance</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSessions}</p>
                <p className="text-xs text-green-600 mt-1">{stats.activeSessions} active</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pledges</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPledges}</p>
                <p className="text-xs text-gray-500 mt-1">₹{stats.totalPledgeValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Executions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalExecutions}</p>
                <p className="text-xs text-gray-500 mt-1">₹{stats.totalExecutionValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commission</p>
                <p className="text-3xl font-bold text-green-600 mt-1">₹{stats.totalCommission.toLocaleString()}</p>
                <p className="text-xs text-yellow-600 mt-1">₹{stats.pendingPayouts.toLocaleString()} pending</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Sessions</CardTitle>
            <Link to={createPageUrl('AdvisorPledgeManagement') + '?section=sessions'}>
              <button className="text-sm text-blue-600 hover:text-blue-700">View All →</button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No sessions yet</p>
              <p className="text-sm text-gray-500 mt-2">Create your first pledge session to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">{session.stock_symbol}</p>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{session.stock_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.total_pledges || 0} pledges • ₹{(session.total_pledge_value || 0).toLocaleString()} value
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(session.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Commission Earnings</CardTitle>
            <Link to={createPageUrl('AdvisorPledgeManagement') + '?section=commissions'}>
              <button className="text-sm text-blue-600 hover:text-blue-700">View All →</button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentCommissions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No commission records yet</p>
              <p className="text-sm text-gray-500 mt-2">Execute pledge sessions to start earning commission</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentCommissions.map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold">{commission.stock_symbol}</p>
                      <Badge className={commission.payout_status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {commission.payout_status === 'processed' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                        {commission.payout_status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {commission.commission_type === 'convenience_fee' && 'Convenience Fee'}
                      {commission.commission_type === 'trading_profit' && 'Trading Profit'}
                      {commission.commission_type === 'both' && 'Combined Commission'}
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