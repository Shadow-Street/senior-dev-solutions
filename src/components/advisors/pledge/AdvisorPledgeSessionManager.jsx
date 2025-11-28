
import React, { useState, useEffect } from 'react';
import { PledgeSession } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import AdvisorPledgeSessionFormModal from './AdvisorPledgeSessionFormModal';

export default function AdvisorPledgeSessionManager({ user, advisorProfile, accessRequest }) {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // This is the single, updated loadSessions function. It's defined here
  // so it can be called by both useEffect for initial load and onSuccess for refresh.
  const loadSessions = async (signal = null) => {
    if (!advisorProfile?.id) {
      setSessions([]); // Clear sessions if advisorProfile.id is not available
      setIsLoading(false);
      return;
    }

    setIsLoading(true); // Indicate loading has started
    try {
      const options = signal ? { signal } : {}; // Prepare options to pass AbortSignal
      const advisorSessions = await PledgeSession.filter(
        { created_by_advisor_id: advisorProfile.id },
        '-created_date',
        options // Pass the options object, including the signal
      ).catch((err) => {
        // Handle AbortError specifically to avoid logging expected cancellations
        if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
          return []; // Return an empty array if the request was aborted
        }
        throw err; // Re-throw other errors
      });
      
      // Only update state if the operation was not aborted
      if (!signal?.aborted) {
        setSessions(advisorSessions);
      }
    } catch (error) {
      // Log errors that are not due to abortion
      if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
        console.error('Error loading sessions:', error);
        toast.error('Failed to load pledge sessions. Please try again.'); // User feedback
      }
      // If an error occurred and it wasn't an abort, ensure state reflects error (e.g., clear sessions)
      if (!signal?.aborted) {
        setSessions([]);
      }
    } finally {
      // Always set isLoading to false unless the operation was aborted
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true; // Flag to check if the component is still mounted
    const abortController = new AbortController();

    // Call the loadSessions function with the abort signal for cleanup
    loadSessions(abortController.signal);

    return () => {
      isMounted = false; // Set flag to false when component unmounts
      abortController.abort(); // Abort any pending fetch requests
    };
  }, [advisorProfile?.id]); // Re-run effect if advisorProfile.id changes

  const getStatusBadge = (status) => {
    const config = {
      'pending_approval': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending Approval' },
      'approved': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Approved' },
      'active': { color: 'bg-green-100 text-green-800', icon: TrendingUp, text: 'Active' },
      'closed': { color: 'bg-gray-100 text-gray-800', icon: Clock, text: 'Closed' },
      'executing': { color: 'bg-purple-100 text-purple-800', icon: TrendingUp, text: 'Executing' },
      'completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Completed' },
      'rejected': { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejected' }
    };
    const { color, icon: Icon, text } = config[status] || config['pending_approval'];
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Pledge Sessions</h2>
          <p className="text-gray-600 mt-1">Create and manage pledge sessions for your followers</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
            <p className="text-gray-600 mb-6">Create your first pledge session to get started</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{session.stock_symbol}</CardTitle>
                      {getStatusBadge(session.status)}
                    </div>
                    <p className="text-gray-600 text-sm">{session.stock_name}</p>
                    {session.description && (
                      <p className="text-gray-600 text-sm mt-2">{session.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Session Mode</p>
                    <p className="font-semibold">{session.session_mode?.replace(/_/g, ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Pledges</p>
                    <p className="font-semibold">{session.total_pledges || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="font-semibold">₹{(session.total_pledge_value || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-semibold">{new Date(session.created_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {session.status === 'pending_approval' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⏳ Waiting for SuperAdmin approval before this session can go live
                    </p>
                  </div>
                )}

                {session.status === 'rejected' && session.admin_notes && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {session.admin_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <AdvisorPledgeSessionFormModal
          user={user}
          advisorProfile={advisorProfile}
          accessRequest={accessRequest}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSessions(); // Call the shared loadSessions function to refresh data
          }}
        />
      )}
    </div>
  );
}
