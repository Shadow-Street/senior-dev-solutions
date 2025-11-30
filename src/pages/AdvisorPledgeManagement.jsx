import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { Loader2, Lock } from 'lucide-react';
import AdvisorLayout from '../components/layouts/AdvisorLayout';
import PledgeManagementAccess from '../components/advisors/PledgeManagementAccess';
import AdvisorPledgeOverview from '../components/advisors/pledge/AdvisorPledgeOverview';
import AdvisorPledgeSessionManager from '../components/advisors/pledge/AdvisorPledgeSessionManager';
import AdvisorPledgeExecutionPanel from '../components/advisors/pledge/AdvisorPledgeExecutionPanel';
import AdvisorPledgeAnalytics from '../components/advisors/pledge/AdvisorPledgeAnalytics';
import AdvisorCommissionTracker from '../components/advisors/pledge/AdvisorCommissionTracker';
import AdvisorPledgeFinancials from '../components/advisors/pledge/AdvisorPledgeFinancials';

export default function AdvisorPledgeManagementPage() {
  const [user, setUser] = useState(null);
  const [advisorProfile, setAdvisorProfile] = useState(null);
  const [accessRequest, setAccessRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get section from URL params (default to 'overview')
  const urlParams = new URLSearchParams(window.location.search);
  const section = urlParams.get('section') || 'overview';

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const currentUser = await base44.auth.me();
        if (!isMounted || abortController.signal.aborted) return;
        
        setUser(currentUser);
        console.log('✅ User loaded:', currentUser.id);

        // Load advisor profiles with explicit error handling
        let advisorProfiles = [];
        try {
          const profilesResult = await base44.entities.Advisor.filter({ 
            user_id: currentUser.id 
          });
          advisorProfiles = Array.isArray(profilesResult) ? profilesResult : [];
        } catch (error) {
          console.error('Error loading advisor profiles:', error);
          advisorProfiles = [];
        }
        
        if (!isMounted || abortController.signal.aborted) return;
        
        if (advisorProfiles.length > 0) {
          setAdvisorProfile(advisorProfiles[0]);
          console.log('✅ Advisor profile loaded:', advisorProfiles[0].status);

          // Load access requests with explicit error handling and validation
          let requests = [];
          try {
            const requestsResult = await base44.entities.AdvisorPledgeAccessRequest.filter({
              user_id: currentUser.id
            });
            
            // Ensure we have a valid array
            if (requestsResult && Array.isArray(requestsResult)) {
              requests = requestsResult;
            } else if (requestsResult) {
              // If it's a single object, wrap it in an array
              requests = [requestsResult];
            } else {
              requests = [];
            }
          } catch (error) {
            console.error('Error loading access requests:', error);
            requests = [];
          }
          
          if (!isMounted || abortController.signal.aborted) return;
          
          // Find approved request - safely iterate through the array
          if (requests.length > 0) {
            const approvedRequest = requests.find(r => r && r.status === 'approved');
            if (approvedRequest) {
              setAccessRequest(approvedRequest);
              console.log('✅ Approved access request found');
            } else {
              console.log('⚠️ No approved access request found');
              setAccessRequest(null);
            }
          } else {
            console.log('⚠️ No access requests found');
            setAccessRequest(null);
          }
        } else {
          console.log('⚠️ No advisor profile found');
          setAdvisorProfile(null);
        }
      } catch (error) {
        if (!error?.message?.includes('aborted')) {
          console.error('Error loading data:', error);
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
  }, []);

  if (isLoading) {
    return (
      <AdvisorLayout user={user}>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading Pledge Management...</p>
          </div>
        </div>
      </AdvisorLayout>
    );
  }

  if (!advisorProfile) {
    return (
      <AdvisorLayout user={user}>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
          <div className="max-w-md p-6 text-center bg-white rounded-xl shadow-lg">
            <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Advisor Profile Required</h2>
            <p className="text-gray-600">You need an approved advisor profile to access pledge management features.</p>
          </div>
        </div>
      </AdvisorLayout>
    );
  }

  if (!accessRequest) {
    return (
      <AdvisorLayout user={user}>
        <PledgeManagementAccess user={user} advisorProfile={advisorProfile} />
      </AdvisorLayout>
    );
  }

  // Render content based on section
  const renderContent = () => {
    switch (section) {
      case 'overview':
        return (
          <AdvisorPledgeOverview 
            user={user}
            advisorProfile={advisorProfile}
            accessRequest={accessRequest}
          />
        );
      case 'sessions':
        return (
          <AdvisorPledgeSessionManager 
            user={user}
            advisorProfile={advisorProfile}
            accessRequest={accessRequest}
          />
        );
      case 'executions':
        return (
          <AdvisorPledgeExecutionPanel
            user={user}
            advisorProfile={advisorProfile}
            accessRequest={accessRequest}
          />
        );
      case 'analytics':
        return (
          <AdvisorPledgeAnalytics
            user={user}
            advisorProfile={advisorProfile}
          />
        );
      case 'commissions':
        return (
          <AdvisorCommissionTracker
            user={user}
            advisorProfile={advisorProfile}
          />
        );
      case 'financials':
        return (
          <AdvisorPledgeFinancials
            user={user}
            advisorProfile={advisorProfile}
            accessRequest={accessRequest}
          />
        );
      default:
        return (
          <AdvisorPledgeOverview 
            user={user}
            advisorProfile={advisorProfile}
            accessRequest={accessRequest}
          />
        );
    }
  };

  return (
    <AdvisorLayout user={user}>
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        {renderContent()}
      </div>
    </AdvisorLayout>
  );
}