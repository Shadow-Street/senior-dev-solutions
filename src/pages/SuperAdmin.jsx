import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/context/AuthContext';
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
  const { user: currentUser, loading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // ✅ Helper function to check if user is super admin
  const isSuperAdmin = (user) => {
    if (!user) return false;
    return user.app_role === 'super_admin' || user.role === 'super_admin';
  };

  // Redirect if not logged in or not super admin
  useEffect(() => {
    if (!isAuthLoading) {
      if (!currentUser) {
        navigate('/admin/login');
      } else if (!isSuperAdmin(currentUser)) {
        navigate('/'); // Redirect unauthorized users to home
      }
    }
  }, [currentUser, isAuthLoading, navigate]);

  const handleLogout = async () => {
    // AuthContext's logout handles redirection
    window.location.href = '/admin/login';
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

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Super Admin Panel...</p>
        </div>
      </div>
    );
  }

  // ✅ Check both role and app_role
  if (!currentUser || !isSuperAdmin(currentUser)) {
    return null; // Will trigger redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <EnsureSuperAdminRoles />

      {/* Sidebar */}
      <aside className="w-72 bg-[#0F172A] text-white flex-shrink-0 flex flex-col shadow-2xl z-20">
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-white" />
            <span className="text-xl font-bold tracking-wide">Super Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Administration
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
            <TabsList className="flex flex-col h-auto bg-transparent p-0 w-full space-y-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.value;
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={`w-full justify-start px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-none ${isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{tab.label}</span>
                      {/* Description hidden for compactness in sidebar, or can be kept if desired */}
                      <span className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-600 hidden group-hover:block'}`}>{tab.description}</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <img
                src={currentUser?.profile_image_url || `https://avatar.vercel.sh/${currentUser?.email || 'admin'}.png`}
                alt="Admin"
                className="w-10 h-10 rounded-full ring-2 ring-blue-500/50"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser?.display_name || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 border border-red-500/20 hover:border-red-500"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-gray-50 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              {(() => {
                const currentTab = tabs.find(t => t.value === activeTab);
                const Icon = currentTab?.icon || LayoutDashboard;
                return <Icon className="w-6 h-6 text-blue-600" />;
              })()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{tabs.find(t => t.value === activeTab)?.label}</h1>
              <p className="text-sm text-gray-500">{tabs.find(t => t.value === activeTab)?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <Activity className="w-4 h-4" />
              <span>System Healthy</span>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              {currentUser?.app_role}
            </Badge>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-10">
            {(() => {
              const CurrentComponent = tabs.find(tab => tab.value === activeTab)?.component;
              return CurrentComponent ? <CurrentComponent user={currentUser} setActiveTab={setActiveTab} /> : null;
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}