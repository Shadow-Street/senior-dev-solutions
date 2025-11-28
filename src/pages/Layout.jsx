
import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, MessageSquare, BarChart3, CalendarDays, Shield, Star, Sparkles, Wallet, Crown, Edit3, Home, Briefcase } from "lucide-react";
import { Toaster } from "sonner";

function InnerLayout({ children, currentPageName }) {
  const location = useLocation();
  
  // Mock user for UI purposes only - no authentication
  const mockUser = {
    id: "demo-user",
    display_name: "Demo User",
    email: "demo@protocall.com",
    app_role: "trader",
    roles: ["trader"],
    profile_image_url: null
  };

  // Check if current page should show without sidebar
  const isLandingPage = 
    location.pathname === '/' || 
    location.pathname === createPageUrl('Landing') ||
    location.pathname.toLowerCase() === '/landing' ||
    currentPageName === 'Landing';
  
  const isPublicContentPage = 
    location.pathname === createPageUrl('Blogs') || 
    currentPageName === 'Blogs' ||
    location.pathname === createPageUrl('BlogArticle') || 
    currentPageName === 'BlogArticle' ||
    location.pathname === createPageUrl('News') || 
    currentPageName === 'News' ||
    location.pathname === createPageUrl('Contact') || 
    currentPageName === 'Contact' ||
    location.pathname === createPageUrl('ContactSupport') || 
    currentPageName === 'ContactSupport' ||
    location.pathname === createPageUrl('Privacy') || 
    currentPageName === 'Privacy' ||
    location.pathname === createPageUrl('Terms') || 
    currentPageName === 'Terms' ||
    location.pathname === createPageUrl('Cookies') || 
    currentPageName === 'Cookies' ||
    location.pathname === createPageUrl('RiskDisclosure') || 
    currentPageName === 'RiskDisclosure';

  const isSuperAdminPage = location.pathname === createPageUrl('SuperAdmin') || currentPageName === 'SuperAdmin';
  
  const isAdvisorPortalPage = 
    location.pathname === createPageUrl('AdvisorDashboard') || 
    currentPageName === 'AdvisorDashboard' ||
    location.pathname === createPageUrl('AdvisorPledgeManagement') || 
    currentPageName === 'AdvisorPledgeManagement' ||
    location.pathname === createPageUrl('OrganizerDashboard') || 
    currentPageName === 'OrganizerDashboard';

  const isFinfluencerPortalPage = 
    location.pathname === createPageUrl('FinfluencerDashboard') || 
    currentPageName === 'FinfluencerDashboard';

  const isPMPortalPage =
    location.pathname === createPageUrl('PortfolioManagerDashboard') ||
    currentPageName === 'PortfolioManagerDashboard';

  const displayNavigationItems = useMemo(() => {
    const hardcodedOrder = [
      { key: 'dashboard', title: 'Dashboard', url: createPageUrl('Dashboard'), icon: LayoutDashboard, badge: null },
      { key: 'my_portfolio', title: 'My Portfolio', url: createPageUrl('MyPortfolio'), icon: Wallet, badge: null },
      { key: 'chat_rooms', title: 'Chat Rooms', url: createPageUrl('ChatRooms'), icon: MessageSquare, badge: null },
      { key: 'polls', title: 'Community Polls', url: createPageUrl('Polls'), icon: BarChart3, badge: null },
      { key: 'pledge_pool', title: 'Pledge Pool', url: createPageUrl('PledgePool'), icon: Crown, badge: null },
      { key: 'events', title: 'Events', url: createPageUrl('Events'), icon: CalendarDays, badge: null },
      { key: 'advisors', title: 'Advisors', url: createPageUrl('Advisors'), icon: Shield, badge: null },
      { key: 'finfluencers', title: 'Finfluencers', url: createPageUrl('Finfluencers'), icon: Star, badge: null },
      { key: 'subscription', title: 'Subscription', url: createPageUrl('Subscription'), icon: Sparkles, badge: null },
      { key: 'feedback', title: 'Feedback', url: createPageUrl('Feedback'), icon: MessageSquare, badge: null },
    ];

    const allItems = [...hardcodedOrder];
    
    const eventsIndex = allItems.findIndex(item => item.key === 'events');
    if (eventsIndex !== -1) {
      allItems.splice(eventsIndex + 1, 0, {
        key: 'organize_events',
        title: 'Organize Events',
        url: createPageUrl('OrganizerDashboard'),
        icon: CalendarDays,
        badge: { text: 'Portal', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      });
    }

    const advisorsIndex = allItems.findIndex(item => item.key === 'advisors');
    if (advisorsIndex !== -1) {
      allItems.splice(advisorsIndex + 1, 0, {
        key: 'advisor_dashboard',
        title: 'Advisor Dashboard',
        url: createPageUrl('AdvisorDashboard'),
        icon: Shield,
        badge: { text: 'Portal', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      });
      
      allItems.splice(advisorsIndex + 2, 0, {
        key: 'advisor_pledge_management',
        title: 'Pledge Management',
        url: createPageUrl('AdvisorPledgeManagement'),
        icon: Crown,
        badge: { text: 'Portal', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      });
    }

    const finfluencersIndex = allItems.findIndex(item => item.key === 'finfluencers');
    if (finfluencersIndex !== -1) {
      allItems.splice(finfluencersIndex + 1, 0, {
        key: 'finfluencer_dashboard',
        title: 'Finfluencer Dashboard',
        url: createPageUrl('FinfluencerDashboard'),
        icon: Star,
        badge: { text: 'Portal', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      });
    }

    if (advisorsIndex !== -1) {
      allItems.splice(advisorsIndex + 1, 0, {
        key: 'pm_dashboard',
        title: 'PM Dashboard',
        url: createPageUrl('PortfolioManagerDashboard'),
        icon: Briefcase,
        badge: { text: 'Portal', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      });
    }

    return allItems;
  }, []);

  // Show pages without sidebar
  if (isLandingPage || isPublicContentPage) {
    return <>{children}</>;
  }

  // Show portal pages without main sidebar
  if (isSuperAdminPage || isAdvisorPortalPage || isFinfluencerPortalPage || isPMPortalPage) {
    return <>{children}</>;
  }

  // Show all other pages with sidebar
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'sonner-toast',
          style: {
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            border: 'none',
          },
        }}
        richColors={false}
      />
      
      <style>{`
        .sidebar-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          min-height: 140px;
          background: #3d3647;
          width: 100%;
        }
        .sidebar-logo img {
          width: 100%;
          height: 100%;
          min-height: 140px;
          object-fit: cover;
          object-position: center;
        }
      `}</style>

      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full bg-gray-50">
          <Sidebar className="border-r border-gray-200 bg-white">
            <SidebarHeader className="p-0">
              <div className="sidebar-logo">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bb21f4e5ccdcab161121f6/3023c1fa9_1235.png"
                  alt="Protocall - Financial Networking Platform"
                />
              </div>
            </SidebarHeader>

            <SidebarContent className="flex-1 flex flex-col gap-2 overflow-y-auto p-3">
              <div className="mb-4">
                <Link to={createPageUrl("Profile")} className="block">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 cursor-pointer text-white relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {mockUser.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-sm">{mockUser.display_name || 'Trader'}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Edit3 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
                  Trading Hub
                </SidebarGroupLabel>
                <SidebarMenu>
                  {displayNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge variant="outline" className={`ml-auto text-xs ${item.badge.color}`}>
                              {item.badge.text}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-gray-200 p-3">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                  {mockUser.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{mockUser.display_name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{mockUser.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-gray-200 relative flex-shrink-0">
              <div className="px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">{currentPageName || 'Protocall'}</h1>
                <div className="flex items-center gap-4">
                  <Link to={createPageUrl('Landing')}>
                    <Button variant="outline" className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Home className="w-4 h-4" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </div>
            </header>
            
            <main className="flex-1 overflow-y-auto bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return <InnerLayout currentPageName={currentPageName}>{children}</InnerLayout>;
}
