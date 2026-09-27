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
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Analytics & Overview', component: DashboardHome, color: 'text-protocall-blue' },
    { value: 'users', label: 'User Management', icon: Users, description: 'Manage All Users', component: UserManagement, color: 'text-buy-muted-foreground' },
    { value: 'Advisor', label: 'Stock Advisors', icon: Shield, description: 'SEBI Advisor Approvals', component: AdvisorManagement, color: 'text-protocall-premium-text' },
    { value: 'pms', label: 'Portfolio Managers', icon: Briefcase, description: 'SEBI PM Approvals & Management', component: PMSManagement, color: 'text-protocall-blue' },
    { value: 'FinInfluencer', label: 'Finfluencers', icon: Star, description: 'Manage Content Creators', component: FinfluencerManagement, color: 'text-hold' },
    { value: 'chatrooms', label: 'Chat Room Management', icon: MessageSquare, description: 'Manage Chat Rooms & Messages', component: ChatRoomManagement, color: 'text-protocall-blue' },
    { value: 'content', label: 'Content Moderation', icon: MessageSquare, description: 'Review Flagged Content', component: ContentModeration, color: 'text-sell-muted-foreground' },
    { value: 'polls', label: 'Polls & Pledges', icon: BarChart3, description: 'Manage Community Polls & Pledges', component: PollManagement, color: 'text-protocall-blue' },
    { value: 'pledge-management', label: 'Pledge Management', icon: Target, description: 'Manage Pledge Sessions & Executions', component: PledgeManagement, color: 'text-protocall-premium-text' },
    { value: 'ad-management', label: 'Ad Management', icon: Megaphone, description: 'Manage Vendor Ad Campaigns', component: AdManagement, color: 'text-positive' },
    { value: 'events', label: 'Events Management', icon: CalendarDays, description: 'Organize and manage community events', component: EventsManagement, color: 'text-protocall-premium-light' },
    { value: 'announcements', label: 'Announcements', icon: Megaphone, description: 'Manage platform-wide announcements', component: AnnouncementManagement, color: 'text-hold' },
    { value: 'lifecycle', label: 'Product Lifecycle Manager', icon: TrendingUp, description: 'Manage features, pages, and releases', component: ProductLifecycleManager, color: 'text-protocall-blue' },
    { value: 'feature-hub', label: 'Feature Hub Content', icon: Package, description: 'Manage Feature Hub sections & items', component: FeatureHubContent, color: 'text-protocall-premium-text' },
    { value: 'financials', label: 'Financials', icon: DollarSign, description: 'Revenue & Payouts', component: Financials, color: 'text-hold-muted-foreground' },
    { value: 'subscriptions', label: 'Subscriptions', icon: CreditCard, description: 'Plans, Pricing & Promos', component: SubscriptionManagement, color: 'text-sell-muted-foreground' },
    { value: 'refunds', label: 'Refund Management', icon: CreditCard, description: 'Process and track user refunds', component: RefundManagement, color: 'text-hold-muted-foreground' },
    { value: 'alerts', label: 'System Alerts', icon: Bell, description: 'Monitor System Alerts', component: AlertsManagement, color: 'text-hold-muted-foreground' },
    { value: 'activity-logs', label: 'Activity Logs', icon: Activity, description: 'Complete audit trail of admin actions', component: ActivityLogs, color: 'text-protocall-blue' },
    { value: 'feedback', label: 'Feedback & Support', icon: MessageSquare, description: 'Feedback, Inquiries & Reviews', component: FeedbackAndSupport, color: 'text-protocall-blue' },
    { value: 'settings', label: 'Platform Settings', icon: Settings, description: 'Platform Configuration', component: PlatformSettings, color: 'text-subtle' },
  ], []);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue mx-auto mb-4"></div>
          <p className="text-subtle">Loading Super Admin Panel...</p>
        </div>
      </div>
    );
  }

  // ✅ Check both role and app_role
  if (!currentUser || !isSuperAdmin(currentUser)) {
    return null; // Will trigger redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-surface-2 flex font-sans">
      <EnsureSuperAdminRoles />

      {/* Sidebar */}
      <aside className="w-72 bg-protocall-sidebar-bg text-white flex-shrink-0 flex flex-col shadow-2xl z-20">
        {/* Sidebar Header */}
        <div className="h-20 flex items-center px-6 bg-gradient-to-r from-protocall-deep to-protocall-blue shadow-lg">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-white" />
            <span className="text-xl font-bold tracking-wide">Super Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                      ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white shadow-lg shadow-protocall-deep/30/20'
                      : 'text-muted-foreground hover:bg-protocall-ink hover:text-white'
                      }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{tab.label}</span>
                      {/* Description hidden for compactness in sidebar, or can be kept if desired */}
                      <span className={`text-[10px] ${isActive ? 'text-protocall-blue' : 'text-subtle hidden group-hover:block'}`}>{tab.description}</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-protocall-ink bg-protocall-ink/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <img
                src={currentUser?.profile_image_url || `https://avatar.vercel.sh/${currentUser?.email || 'admin'}.png`}
                alt="Admin"
                className="w-10 h-10 rounded-full ring-2 ring-ring/50"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-buy rounded-full border-2 border-protocall-ink"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser?.display_name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-sell/10 text-sell hover:bg-sell hover:text-white transition-all duration-200 border border-sell/20 hover:border-sell"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-surface-2 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-border flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-premium-muted rounded-lg">
              {(() => {
                const currentTab = tabs.find(t => t.value === activeTab);
                const Icon = currentTab?.icon || LayoutDashboard;
                return <Icon className="w-6 h-6 text-protocall-blue" />;
              })()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{tabs.find(t => t.value === activeTab)?.label}</h1>
              <p className="text-sm text-muted-foreground">{tabs.find(t => t.value === activeTab)?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-buy-muted-foreground bg-buy-muted px-3 py-1 rounded-full border border-buy/30">
              <Activity className="w-4 h-4" />
              <span>System Healthy</span>
            </div>
            <Badge variant="secondary" className="bg-premium-muted text-protocall-blue hover:bg-premium-muted">
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