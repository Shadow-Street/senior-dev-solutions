
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp, Clock } from 'lucide-react';

export default function AdvisorPledgeExecutionPanel({ user, advisorProfile, accessRequest }) {
  const [sessions, setSessions] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      if (!advisorProfile?.id) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const [sessionData, executionData] = await Promise.all([
          base44.entities.PledgeSession.filter({ 
            created_by_advisor_id: advisorProfile.id,
            status: { '$in': ['approved', 'active', 'executing', 'awaiting_sell_execution', 'completed'] }
          }).catch(() => []), // Return empty array on error
          base44.entities.PledgeExecutionRecord.filter({ 
            session_id: { '$exists': true }
          }).catch(() => []) // Return empty array on error
        ]);

        if (!isMounted || abortController.signal.aborted) return;

        // Filter executions for advisor's sessions
        const advisorSessionIds = new Set(sessionData.map(s => s.id));
        const advisorExecutions = executionData.filter(e => advisorSessionIds.has(e.session_id));

        setSessions(sessionData);
        setExecutions(advisorExecutions);
      } catch (error) {
        // Only log errors that are not due to abortion
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error('Error loading execution data:', error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [advisorProfile?.id]);

  const getStatusBadge = (status) => {
    const config = {
      'approved': { color: 'bg-blue-100 text-blue-800', text: 'Approved - Ready to Start' },
      'active': { color: 'bg-green-100 text-green-800', text: 'Active - Accepting Pledges' },
      'executing': { color: 'bg-purple-100 text-purple-800', text: 'Executing Trades' },
      'awaiting_sell_execution': { color: 'bg-orange-100 text-orange-800', text: 'Awaiting Sell Execution' },
      'completed': { color: 'bg-gray-100 text-gray-800', text: 'Completed' }
    };
    const { color, text } = config[status] || config['approved'];
    return <Badge className={color}>{text}</Badge>;
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
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Execution Authority:</strong> Only SuperAdmin can execute trades. 
          Once SuperAdmin approves and executes your sessions, you'll earn your commission automatically.
        </AlertDescription>
      </Alert>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Approved Sessions Yet</h3>
            <p className="text-gray-600">Once your sessions are approved by SuperAdmin, they'll appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session) => {
            const sessionExecutions = executions.filter(e => e.session_id === session.id);
            const totalExecutionValue = sessionExecutions.reduce((sum, e) => sum + (e.total_execution_value || 0), 0);

            return (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{session.stock_symbol}</CardTitle>
                      <p className="text-gray-600 text-sm mt-1">{session.stock_name}</p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Pledges</p>
                      <p className="font-semibold text-lg">{session.total_pledges || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pledge Value</p>
                      <p className="font-semibold text-lg">₹{(session.total_pledge_value || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Executions</p>
                      <p className="font-semibold text-lg">{sessionExecutions.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Execution Value</p>
                      <p className="font-semibold text-lg">₹{totalExecutionValue.toLocaleString()}</p>
                    </div>
                  </div>

                  {session.status === 'approved' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        ✅ Session approved! SuperAdmin will execute when market conditions are optimal.
                      </p>
                    </div>
                  )}

                  {sessionExecutions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2">Recent Executions</h4>
                      <div className="space-y-2">
                        {sessionExecutions.slice(0, 3).map((exec) => (
                          <div key={exec.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium">{exec.side.toUpperCase()} - {exec.executed_qty} shares</p>
                              <p className="text-xs text-gray-500">
                                @ ₹{exec.executed_price} on {new Date(exec.executed_at).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="font-semibold">₹{(exec.total_execution_value || 0).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
