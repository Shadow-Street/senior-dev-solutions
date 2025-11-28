import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/api/entities';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  LayoutDashboard,
  Users,
  Shield,
  Star,
  DollarSign,
  Settings,
  LogOut,
  Activity,
  Target,
  TrendingUp,
  MessageSquare,
  Bell,
  CalendarDays,
  CreditCard,
  Package,
  BarChart3,
  Megaphone,
  Briefcase
} from 'lucide-react';

import DashboardHome from '../components/superadmin/DashboardHome';
import UserManagement from '../components/superadmin/UserManagement';
import AdvisorManagement from '../components/superadmin/AdvisorManagement';
import FinfluencerManagement from '../components/superadmin/FinfluencerManagement';
import ContentModeration from '../components/superadmin/ContentModeration';
import Financials from '../components/superadmin/Financials';
import PlatformSettings from '../components/superadmin/PlatformSettings';
import FeedbackAndSupport from '../components/superadmin/FeedbackAndSupport';
import PollManagement from '../components/superadmin/PollManagement';
import AlertsManagement from '../components/superadmin/alerts/AlertsManagement';
import SubscriptionManagement from '../components/superadmin/SubscriptionManagement';
import EventsManagement from '../components/superadmin/EventsManagement';
import PledgeManagement from '../components/superadmin/PledgeManagement';
import AdManagement from '../components/superadmin/AdManagement';
import ChatRoomManagement from '../components/superadmin/ChatRoomManagement';
import ProductLifecycleManager from '../components/superadmin/ProductLifecycleManager';
import ActivityLogs from '../components/superadmin/ActivityLogs';
import AnnouncementManagement from '../components/superadmin/AnnouncementManagement';
import RefundManagement from '../components/superadmin/RefundManagement';
import FeatureHubContent from '../components/superadmin/FeatureHubContent';
import EnsureSuperAdminRoles from '../components/superadmin/users/EnsureSuperAdminRoles';
import PMSManagement from '../components/superadmin/PMSManagement';

export default function SuperAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  // ---- MOCK SUPER ADMIN USER (NO API REQUIRED) ----
const MOCK_SUPER_ADMIN = {
  id: "admin_001",
  display_name: "System Super Admin",
  email: "superadmin@app.com",
  profile_image_url: "https://avatar.vercel.sh/superadmin.png",
  app_role: "super_admin",
  created_at: new Date().toISOString(),
};


  const tabs = useMemo(() => [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Analytics & Overview', component: DashboardHome, color: 'text-blue-600' },
    { value: 'users', label: 'User Management', icon: Users, description: 'Manage All Users', component: UserManagement, color: 'text-green-600' },
    { value: 'Advisor', label: 'Stock Advisors', icon: Shield, description: 'SEBI Advisor Approvals', component: AdvisorManagement, color: 'text-purple-600' },
    { value: 'pms', label: 'Portfolio Managers', icon: Briefcase, description: 'SEBI PM Approvals & Management', component: PMSManagement, color: 'text-blue-700' },
    { value: 'FinInfluencer', label: 'Finfluencers', icon: Star, description: 'Manage Content Creators', component: FinfluencerManagement, color: 'text-yellow-500' },
    { value: 'chatrooms', label: 'Chat Room Management', icon: MessageSquare, description: 'Manage Chat Rooms & Messages', component: ChatRoomManagement, color: 'text-cyan-600' },
    { value: 'content', label: 'Content Moderation', icon: MessageSquare, description: 'Review Flagged Content', component: ContentModeration, color: 'text-red-600' },
    { value: 'polls', label: 'Polls & Pledges', icon: BarChart3, description: 'Manage Community Polls & Pledges', component: PollManagement, color: 'text-cyan-600' },
    { value: 'pledge-management', label: 'Pledge Management', icon: Target, description: 'Manage Pledge Sessions & Executions', component: PledgeManagement, color: 'text-purple-600' },
    { value: 'ad-management', label: 'Ad Management', icon: Megaphone, description: 'Manage Vendor Ad Campaigns', component: AdManagement, color: 'text-teal-500' },
    { value: 'events', label: 'Events Management', icon: CalendarDays, description: 'Organize and manage community events', component: EventsManagement, color: 'text-purple-500' },
    { value: 'announcements', label: 'Announcements', icon: Megaphone, description: 'Manage platform-wide announcements', component: AnnouncementManagement, color: 'text-orange-500' },
    { value: 'lifecycle', label: 'Product Lifecycle Manager', icon: TrendingUp, description: 'Manage features, pages, and releases', component: ProductLifecycleManager, color: 'text-indigo-600' },
    { value: 'feature-hub', label: 'Feature Hub Content', icon: Package, description: 'Manage Feature Hub sections & items', component: FeatureHubContent, color: 'text-violet-600' },
    { value: 'financials', label: 'Financials', icon: DollarSign, description: 'Revenue & Payouts', component: Financials, color: 'text-yellow-600' },
    { value: 'subscriptions', label: 'Subscriptions', icon: CreditCard, description: 'Plans, Pricing & Promos', component: SubscriptionManagement, color: 'text-rose-600' },
    { value: 'refunds', label: 'Refund Management', icon: CreditCard, description: 'Process and track user refunds', component: RefundManagement, color: 'text-amber-600' },
    { value: 'alerts', label: 'System Alerts', icon: Bell, description: 'Monitor System Alerts', component: AlertsManagement, color: 'text-orange-600' },
    { value: 'activity-logs', label: 'Activity Logs', icon: Activity, description: 'Complete audit trail of admin actions', component: ActivityLogs, color: 'text-indigo-600' },
    { value: 'feedback', label: 'Feedback & Support', icon: MessageSquare, description: 'Feedback, Inquiries & Reviews', component: FeedbackAndSupport, color: 'text-indigo-600' },
    { value: 'settings', label: 'Platform Settings', icon: Settings, description: 'Platform Configuration', component: PlatformSettings, color: 'text-gray-600' },
  ], []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user =MOCK_SUPER_ADMIN;
        // await User.me();
        setCurrentUser(user);

        if (user.app_role !== 'super_admin') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error loading user:', error);
        window.location.href = '/';
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const handleLogout = async () => {
    await User.logout();
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Panel...</p>
        </div>
      </div>
    );
  }

  // if (!currentUser || currentUser.app_role !== 'super_admin') {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <EnsureSuperAdminRoles />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-screen bg-gradient-to-br from-slate-100 to-slate-200 font-sans">
        <aside className="w-72 flex-shrink-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-200 flex flex-col shadow-2xl overflow-hidden">
          <div className="h-20 flex items-center justify-center border-b border-slate-700 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Super Admin
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider px-2">Administration</div>
            <TabsList className="w-full grid grid-cols-1 h-auto bg-transparent p-0 space-y-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.value;
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={`group flex items-center w-full justify-start px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 min-h-[60px] ${
                      isActive
                        ? ''
                        : 'hover:bg-slate-700/50 hover:scale-102 text-left text-slate-200'
                    }`}
                  >
                    <div className="w-5 h-5 mr-3 flex items-center justify-center flex-shrink-0">
                      {Icon && <Icon className={`w-5 h-5 ${isActive ? 'text-white' : tab.color}`} />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold leading-tight">{tab.label}</div>
                      <div className={`text-xs leading-tight mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {tab.description}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0"></div>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </nav>
          
          <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img
                  src={currentUser.profile_image_url || `https://avatar.vercel.sh/${currentUser.email}.png`}
                  alt="Admin"
                  className="w-12 h-12 rounded-full ring-2 ring-blue-500"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{currentUser.display_name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/50">
                    {currentUser.app_role}
                  </Badge>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-20 bg-white border-b border-slate-200 flex items-center px-8 justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const currentNavItem = tabs.find(item => item.value === activeTab);
                  const IconComponent = currentNavItem?.icon;
                  return IconComponent ? <IconComponent className={`w-8 h-8 ${currentNavItem.color}`} /> : null;
                })()}
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{tabs.find(item => item.value === activeTab)?.label}</h1>
                  <p className="text-sm text-slate-500">
                    {tabs.find(item => item.value === activeTab)?.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Activity className="w-4 h-4 text-green-500" />
                <span>System Healthy</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {currentUser.app_role}
              </Badge>
            </div>
          </header>

          <div className="flex-1 p-8 bg-gradient-to-br from-slate-50 to-white overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <TabsContent value={activeTab} className="mt-0">
                {(() => {
                  const CurrentComponent = tabs.find(tab => tab.value === activeTab)?.component;
                  if (CurrentComponent) {
                    return <CurrentComponent user={currentUser} />;
                  }
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle>Content Not Found</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>No component configured for the tab: "{activeTab}".</p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </TabsContent>
            </div>
          </div>
        </main>
      </Tabs>
    </div>
  );
}