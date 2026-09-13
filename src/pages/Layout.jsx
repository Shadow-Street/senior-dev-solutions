
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
import { LayoutDashboard, MessageSquare, BarChart3, CalendarDays, Shield, Star, Sparkles, Wallet, Crown, Edit3, Home, Briefcase, CreditCard } from "lucide-react";
import { Toaster } from "sonner";

import { useAuth } from "@/components/context/AuthContext";

function InnerLayout({ children, currentPageName }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  const mockUser = user || {
    id: "guest",
    display_name: "Guest",
    email: "",
    app_role: "guest",
    roles: [],
    profile_image_url: null
  };

  // Check if current page should show without sidebar
  const isLandingPage =
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
      { key: 'my_plans_access', title: 'My Plans & Access', url: '/plans-access', icon: CreditCard, badge: { text: 'Pro', color: 'bg-protocall-premium-light text-protocall-premium-text border-transparent' } },
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
        badge: { text: 'Portal', color: 'bg-protocall-premium-light text-protocall-premium-text border-transparent' }
      });
    }

    const advisorsIndex = allItems.findIndex(item => item.key === 'advisors');
    if (advisorsIndex !== -1) {
      allItems.splice(advisorsIndex + 1, 0, {
        key: 'advisor_dashboard',
        title: 'Advisor Dashboard',
        url: createPageUrl('AdvisorDashboard'),
        icon: Shield,
        badge: { text: 'Portal', color: 'bg-protocall-premium-light text-protocall-premium-text border-transparent' }
      });

      allItems.splice(advisorsIndex + 2, 0, {
        key: 'advisor_pledge_management',
        title: 'Pledge Management',
        url: createPageUrl('AdvisorPledgeManagement'),
        icon: Crown,
        badge: { text: 'Portal', color: 'bg-protocall-premium-light text-protocall-premium-text border-transparent' }
      });
    }

    const finfluencersIndex = allItems.findIndex(item => item.key === 'finfluencers');
    if (finfluencersIndex !== -1) {
      allItems.splice(finfluencersIndex + 1, 0, {
        key: 'finfluencer_dashboard',
        title: 'Finfluencer Dashboard',
        url: createPageUrl('FinfluencerDashboard'),
        icon: Star,
        badge: { text: 'Portal', color: 'bg-protocall-premium-light text-protocall-premium-text border-transparent' }
      });
    }

    if (advisorsIndex !== -1) {
      allItems.splice(advisorsIndex + 1, 0, {
        key: 'pm_dashboard',
        title: 'PM Dashboard',
        url: createPageUrl('PortfolioManagerDashboard'),
        icon: Briefcase,
        badge: { text: 'Portal', color: 'bg-protocall-premium-light text-protocall-premium-text border-transparent' }
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
          background: #0B1024;
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
        <div className="flex h-screen w-full bg-background">
          <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="p-0">
              <div className="flex flex-col items-center justify-center p-4 bg-sidebar-dark text-sidebar-foreground min-h-[140px]">
                <Shield className="w-10 h-10 mb-2" />
                <div className="text-2xl font-bold tracking-tighter">PROTOCOL</div>
                <div className="text-xs text-sidebar-muted-foreground tracking-widest uppercase">Financial Networking</div>
              </div>
            </SidebarHeader>

            <SidebarContent className="flex-1 flex flex-col gap-2 overflow-y-auto p-3">
              <div className="mb-4">
                <Link to={createPageUrl("Profile")} className="block">
                  <div className="p-3 bg-sidebar-dark rounded-lg shadow-md hover:bg-sidebar-accent transition-all duration-200 cursor-pointer text-sidebar-foreground relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm flex-shrink-0">
                        {mockUser.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sidebar-foreground truncate text-sm">{mockUser.display_name || 'Trader'}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Edit3 className="w-4 h-4 text-sidebar-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-sidebar-muted-foreground uppercase tracking-wider px-2 py-2">
                  Trading Hub
                </SidebarGroupLabel>
                <SidebarMenu>
                  {displayNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        className={`text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 rounded-xl mb-1 ${location.pathname === item.url ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md' : ''
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

            <SidebarFooter className="border-t border-sidebar-border p-3">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-dark">
                <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-xs">
                  {mockUser.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{mockUser.display_name || 'User'}</p>
                  <p className="text-xs text-sidebar-muted-foreground truncate">{mockUser.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-card border-b border-border relative flex-shrink-0">
              <div className="px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-foreground">{currentPageName || 'Protocall'}</h1>
                <div className="flex items-center gap-4">
                  <Link to={createPageUrl('Landing')}>
                    <Button variant="outline" className="flex items-center gap-2 hover:bg-protocall-premium-bg hover:text-protocall-blue transition-colors">
                      <Home className="w-4 h-4" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-background">
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
