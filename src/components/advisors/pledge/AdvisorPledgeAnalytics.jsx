
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';

export default function AdvisorPledgeAnalytics({ user, advisorProfile }) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalPledges: 0,
    totalPledgeValue: 0,
    totalExecutions: 0,
    totalExecutionValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadAnalytics = async () => {
      if (!advisorProfile?.id) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const sessions = await base44.entities.PledgeSession.filter({
          created_by_advisor_id: advisorProfile.id
        }, { signal: abortController.signal }).catch((error) => {
          if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
            console.error('Error fetching sessions:', error);
          }
          return []; // Return an empty array on error
        });

        if (!isMounted || abortController.signal.aborted) return;

        const activeSessions = sessions.filter(s => ['active', 'approved', 'executing'].includes(s.status));
        
        const totalPledges = sessions.reduce((sum, s) => sum + (s.total_pledges || 0), 0);
        const totalPledgeValue = sessions.reduce((sum, s) => sum + (s.total_pledge_value || 0), 0);

        // Get executions for advisor's sessions
        const sessionIds = sessions.map(s => s.id);
        const allExecutions = await base44.entities.PledgeExecutionRecord.list({ signal: abortController.signal }).catch((error) => {
          if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
            console.error('Error fetching executions:', error);
          }
          return []; // Return an empty array on error
        });
        
        if (!isMounted || abortController.signal.aborted) return;
        
        const executions = allExecutions.filter(e => sessionIds.includes(e.session_id));
        
        const totalExecutionValue = executions.reduce((sum, e) => sum + (e.total_execution_value || 0), 0);

        if (isMounted && !abortController.signal.aborted) {
          setStats({
            totalSessions: sessions.length,
            activeSessions: activeSessions.length,
            totalPledges,
            totalPledgeValue,
            totalExecutions: executions.length,
            totalExecutionValue
          });
        }
      } catch (error) {
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error('Error loading analytics:', error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [advisorProfile?.id]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pledges</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPledges}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pledge Value</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalPledgeValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Executions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExecutions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Execution Value</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalExecutionValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Session Completion Rate</span>
                <span className="font-semibold">
                  {stats.totalSessions > 0 
                    ? Math.round(((stats.totalSessions - stats.activeSessions) / stats.totalSessions) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${stats.totalSessions > 0 ? ((stats.totalSessions - stats.activeSessions) / stats.totalSessions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Execution Rate</span>
                <span className="font-semibold">
                  {stats.totalPledges > 0 
                    ? Math.round((stats.totalExecutions / stats.totalPledges) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${stats.totalPledges > 0 ? (stats.totalExecutions / stats.totalPledges) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
