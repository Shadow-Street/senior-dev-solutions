import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, DollarSign, BarChart3, Activity, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

import PMOverview from '../components/pm/PMOverview';
import PMClients from '../components/pm/PMClients';
import PMStrategies from '../components/pm/PMStrategies';
import PMTradeConsole from '../components/pm/PMTradeConsole';
import PMBilling from '../components/pm/PMBilling';

export default function PortfolioManagerDashboard() {
  const [user, setUser] = useState(null);
  const [pmProfile, setPmProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get PM profile
      const pmProfiles = await base44.entities.PortfolioManager.filter({ user_id: currentUser.id });
      if (pmProfiles.length > 0) {
        setPmProfile(pmProfiles[0]);
      }
    } catch (error) {
      console.error('Error loading PM data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pmProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Not Registered as PM</h2>
            <p className="text-gray-600">You need to register as a Portfolio Manager to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pmProfile.status !== 'approved') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <Activity className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Pending</h2>
            <p className="text-gray-600 mb-4">
              Your Portfolio Manager application is currently under review by the SuperAdmin.
            </p>
            <p className="text-sm text-gray-500">Status: <span className="font-semibold">{pmProfile.status}</span></p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {pmProfile.display_name} • SEBI Reg: {pmProfile.sebi_registration_number}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-white p-1 rounded-xl shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Strategies</span>
            </TabsTrigger>
            <TabsTrigger value="trade" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Trade Console</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <PMOverview pmProfile={pmProfile} />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <PMClients pmProfile={pmProfile} />
          </TabsContent>

          <TabsContent value="strategies" className="mt-6">
            <PMStrategies pmProfile={pmProfile} />
          </TabsContent>

          <TabsContent value="trade" className="mt-6">
            <PMTradeConsole pmProfile={pmProfile} />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <PMBilling pmProfile={pmProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}