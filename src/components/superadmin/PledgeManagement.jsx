
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users, TrendingUp, BarChart3, Shield, Settings } from 'lucide-react';
import PledgeSessionManager from './pledge/PledgeSessionManager';
import PledgeAccessRequests from './pledge/PledgeAccessRequests';
import PledgeExecutions from './pledge/PledgeExecutions';
import PledgeAnalytics from './pledge/PledgeAnalytics';
import AdvisorPledgeAccessManager from './pledge/AdvisorPledgeAccessManager';
import { PlatformSetting, PledgeAccessRequest, PledgeSession, PledgeExecutionRecord, Pledge } from '@/api/entities';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function PledgeManagement({ user }) {
  const [activeTab, setActiveTab] = useState('sessions');
  const [advisorPledgeEnabled, setAdvisorPledgeEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [accessRequests, setAccessRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  
  // ✅ Add state for executions data
  const [sessions, setSessions] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [isLoadingExecutionsData, setIsLoadingExecutionsData] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAccessRequests();
  }, []);

  // ✅ Load execution data when switching to executions tab
  useEffect(() => {
    if (activeTab === 'executions') {
      loadExecutionsData();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const settings = await PlatformSetting.list().catch(() => []);
      const advisorPledgeSetting = settings.find(s => s.setting_key === 'advisor_pledge_management_enabled');
      setAdvisorPledgeEnabled(advisorPledgeSetting?.setting_value === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const loadAccessRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const requests = await PledgeAccessRequest.list('-created_date').catch(() => []);
      setAccessRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading access requests:', error);
      setAccessRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // ✅ New function to load execution data
  const loadExecutionsData = async () => {
    setIsLoadingExecutionsData(true);
    try {
      const [sessionsData, executionsData, pledgesData] = await Promise.all([
        PledgeSession.list('-created_date').catch(() => []),
        PledgeExecutionRecord.list('-executed_at', 100).catch(() => []),
        Pledge.list().catch(() => [])
      ]);
      
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setExecutions(Array.isArray(executionsData) ? executionsData : []);
      setPledges(Array.isArray(pledgesData) ? pledgesData : []);
    } catch (error) {
      console.error('Error loading executions data:', error);
      setSessions([]);
      setExecutions([]);
      setPledges([]);
    } finally {
      setIsLoadingExecutionsData(false);
    }
  };

  const handleToggleAdvisorPledge = async (enabled) => {
    try {
      const settings = await PlatformSetting.list().catch(() => []);
      const existingSetting = settings.find(s => s.setting_key === 'advisor_pledge_management_enabled');
      
      if (existingSetting) {
        await PlatformSetting.update(existingSetting.id, {
          setting_value: enabled ? 'true' : 'false'
        });
      } else {
        await PlatformSetting.create({
          setting_key: 'advisor_pledge_management_enabled',
          setting_value: enabled ? 'true' : 'false',
          description: 'Enable/disable Advisor Pledge Management feature visibility'
        });
      }
      
      setAdvisorPledgeEnabled(enabled);
      toast.success(enabled ? 'Advisor Pledge Management enabled' : 'Advisor Pledge Management disabled');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleRequestUpdate = (requestId, updates) => {
    setAccessRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, ...updates } : req
    ));
  };

  return (
    <div className="space-y-6">
      {/* Feature Toggle Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Advisor Pledge Management Feature Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-purple-200">
            <div className="flex-1">
              <Label htmlFor="advisor-pledge-toggle" className="text-base font-semibold text-gray-900 cursor-pointer">
                Enable Advisor Pledge Management
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                When enabled, approved advisors with pledge access will see "Pledge Management" in their dashboard sidebar
              </p>
            </div>
            <Switch
              id="advisor-pledge-toggle"
              checked={advisorPledgeEnabled}
              onCheckedChange={handleToggleAdvisorPledge}
              disabled={isLoadingSettings}
              className="ml-4"
            />
          </div>
          {advisorPledgeEnabled && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ Advisor Pledge Management is currently <strong>enabled</strong>. Advisors can access pledge features from their dashboard.
              </p>
            </div>
          )}
          {!advisorPledgeEnabled && !isLoadingSettings && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                ⚠ Advisor Pledge Management is currently <strong>disabled</strong>. Advisors cannot see or access pledge management features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Tabs */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Pledge Pool Management
          </CardTitle>
          <p className="text-sm text-slate-500">Manage pledge sessions, executions, and user access</p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-4 h-auto bg-transparent p-0">
          <TabsTrigger 
            value="sessions" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'sessions'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Sessions</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>

          <TabsTrigger 
            value="access" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'access'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">User Access</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>

          <TabsTrigger 
            value="advisor-access" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'advisor-access'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Advisor Access</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>

          <TabsTrigger 
            value="executions" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'executions'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Executions</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>

          <TabsTrigger 
            value="analytics" 
            className="w-full h-auto p-0 transition-all duration-300 data-[state=active]:scale-105"
          >
            <Card className={`w-full border-0 rounded-full transition-all duration-300 ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md'
            }`}>
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2 justify-center">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Analytics</span>
                </div>
              </CardContent>
            </Card>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <PledgeSessionManager user={user} />
        </TabsContent>

        <TabsContent value="access">
          <PledgeAccessRequests 
            requests={accessRequests}
            onRequestUpdate={handleRequestUpdate}
            onRefresh={loadAccessRequests}
            isLoading={isLoadingRequests}
          />
        </TabsContent>

        <TabsContent value="advisor-access">
          <AdvisorPledgeAccessManager user={user} />
        </TabsContent>

        <TabsContent value="executions">
          <PledgeExecutions 
            user={user}
            sessions={sessions}
            executions={executions}
            pledges={pledges}
            onRefresh={loadExecutionsData}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <PledgeAnalytics user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
