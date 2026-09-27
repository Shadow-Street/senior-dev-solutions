
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Calendar, 
  LogOut, 
  User as UserIcon, 
  ChevronDown,
  Home,
  ArrowLeft,
  FileText,
  Video,
  Users,
  DollarSign,
  BarChart3,
  CalendarDays,
  TrendingUp,
  Wallet,
  LayoutDashboard
} from 'lucide-react';
import { User } from '@/api/entities';

export default function FinfluencerLayout({ children, activePage }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [finfluencerOpen, setFinfluencerOpen] = useState(true);
  const [organizerOpen, setOrganizerOpen] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me().catch(() => null);
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const finfluencerNavItems = [
    { 
      key: 'finfluencer-overview', 
      title: 'Overview', 
      url: createPageUrl('FinfluencerDashboard'), 
      icon: LayoutDashboard,
      description: 'Dashboard stats',
      matchPattern: (path, search) => path === createPageUrl('FinfluencerDashboard') && (!search || search === '')
    },
    { 
      key: 'finfluencer-content', 
      title: 'My Content', 
      url: createPageUrl('FinfluencerDashboard') + '?tab=content', 
      icon: Video,
      description: 'Videos & posts',
      matchPattern: (path, search) => path === createPageUrl('FinfluencerDashboard') && search === '?tab=content'
    },
    { 
      key: 'finfluencer-courses', 
      title: 'Courses', 
      url: createPageUrl('FinfluencerDashboard') + '?tab=courses', 
      icon: FileText,
      description: 'Manage courses',
      matchPattern: (path, search) => path === createPageUrl('FinfluencerDashboard') && search === '?tab=courses'
    },
    { 
      key: 'finfluencer-followers', 
      title: 'Followers', 
      url: createPageUrl('FinfluencerDashboard') + '?tab=followers', 
      icon: Users,
      description: 'View followers',
      matchPattern: (path, search) => path === createPageUrl('FinfluencerDashboard') && search === '?tab=followers'
    },
    { 
      key: 'finfluencer-financials', 
      title: 'Financials', 
      url: createPageUrl('FinfluencerDashboard') + '?tab=financials', 
      icon: Wallet,
      description: 'Earnings & payouts',
      matchPattern: (path, search) => path === createPageUrl('FinfluencerDashboard') && search === '?tab=financials'
    },
    { 
      key: 'finfluencer-analytics', 
      title: 'Analytics', 
      url: createPageUrl('FinfluencerDashboard') + '?tab=analytics', 
      icon: BarChart3,
      description: 'Performance stats',
      matchPattern: (path, search) => path === createPageUrl('FinfluencerDashboard') && search === '?tab=analytics'
    },
  ];

  const organizerNavItems = [
    { 
      key: 'organizer-overview', 
      title: 'Overview', 
      url: createPageUrl('OrganizerDashboard'), 
      icon: LayoutDashboard,
      description: 'Dashboard stats & overview',
      matchPattern: (path, search) => path === createPageUrl('OrganizerDashboard') && (!search || search === '')
    },
    { 
      key: 'organizer-events', 
      title: 'My Events', 
      url: createPageUrl('OrganizerDashboard') + '?tab=events', 
      icon: CalendarDays,
      description: 'Manage events',
      matchPattern: (path, search) => path === createPageUrl('OrganizerDashboard') && search === '?tab=events'
    },
    { 
      key: 'organizer-analytics', 
      title: 'Analytics', 
      url: createPageUrl('OrganizerDashboard') + '?tab=analytics', 
      icon: TrendingUp,
      description: 'Event performance',
      matchPattern: (path, search) => path === createPageUrl('OrganizerDashboard') && search === '?tab=analytics'
    },
    { 
      key: 'organizer-financials', 
      title: 'Financials', 
      url: createPageUrl('OrganizerDashboard') + '?tab=financials', 
      icon: DollarSign,
      description: 'Revenue & payouts',
      matchPattern: (path, search) => path === createPageUrl('OrganizerDashboard') && search === '?tab=financials'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue mx-auto mb-4"></div>
          <p className="text-subtle">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="w-80 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-screen overflow-hidden">
          {user && (
            <div className="px-4 py-6 border-b border-sidebar-border flex-shrink-0">
              <div className="p-4 bg-sidebar-dark rounded-xl shadow-lg text-sidebar-foreground">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt={user.display_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{user.display_name?.charAt(0)?.toUpperCase() || 'F'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm leading-tight">{user.display_name || 'Finfluencer'}</p>
                    <p className="text-xs text-white/80 truncate">{user.email}</p>
                  </div>
                </div>
                <Badge className="bg-protocall-premium-light text-protocall-premium-text border-0 text-xs w-full justify-center py-1.5">
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  Finfluencer
                </Badge>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              <Collapsible open={finfluencerOpen} onOpenChange={setFinfluencerOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-sidebar-dark hover:bg-sidebar-accent transition-colors">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-sidebar-foreground" />
                    <span className="font-semibold text-sm text-sidebar-foreground">Finfluencer Dashboard</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-sidebar-muted-foreground transition-transform ${finfluencerOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="space-y-1 pl-2">
                    {finfluencerNavItems.map((item) => {
                      const isActive = item.matchPattern(location.pathname, location.search);
                      const Icon = item.icon;
                      return (
                        <Link 
                          key={item.key}
                          to={item.url} 
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md' 
                              : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-protocall-premium-light'}`} />
                          <div className="flex-1 text-left">
                            <p className={`text-sm font-medium leading-tight ${isActive ? 'text-white' : 'text-sidebar-foreground'}`}>
                              {item.title}
                            </p>
                            <p className={`text-xs leading-tight mt-0.5 ${isActive ? 'text-sidebar-muted-foreground' : 'text-sidebar-muted-foreground'}`}>
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={organizerOpen} onOpenChange={setOrganizerOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-sidebar-dark hover:bg-sidebar-accent transition-colors">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sidebar-foreground" />
                    <span className="font-semibold text-sm text-sidebar-foreground">Event Organizer</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-sidebar-muted-foreground transition-transform ${organizerOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="space-y-1 pl-2">
                    {organizerNavItems.map((item) => {
                      const isActive = item.matchPattern(location.pathname, location.search);
                      const Icon = item.icon;
                      return (
                        <Link 
                          key={item.key}
                          to={item.url} 
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md' 
                              : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-protocall-premium-light'}`} />
                          <div className="flex-1 text-left">
                            <p className={`text-sm font-medium leading-tight ${isActive ? 'text-white' : 'text-sidebar-foreground'}`}>
                              {item.title}
                            </p>
                            <p className={`text-xs leading-tight mt-0.5 ${isActive ? 'text-sidebar-muted-foreground' : 'text-sidebar-muted-foreground'}`}>
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-sidebar-border flex-shrink-0">
            <Link to={createPageUrl('Dashboard')}>
              <Button 
                variant="outline" 
                className="w-full h-12 flex items-center justify-center gap-2 bg-sidebar-dark hover:bg-sidebar-accent border-sidebar-border text-sidebar-foreground font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go to Main Dashboard</span>
              </Button>
            </Link>
          </div>

          <div className="border-t border-sidebar-border p-4 flex-shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-protocall-deep to-protocall-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user.profile_image_url ? (
                        <img src={user.profile_image_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        user.display_name?.charAt(0)?.toUpperCase() || 'F'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.display_name || 'Finfluencer'}</p>
                      <p className="text-xs text-sidebar-muted-foreground truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-sidebar-muted-foreground flex-shrink-0" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Profile")} className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-sell-muted-foreground">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden h-screen">
          <div className="bg-surface-2 border-b border-protocall-premium-light px-8 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-premium-muted flex items-center justify-center">
                  <Star className="w-5 h-5 text-protocall-blue" />
                </div>
                <span className="font-bold text-base text-protocall-blue">Finfluencer Portal</span>
              </div>
              <Link to={createPageUrl('Dashboard')}>
                <Button 
                  variant="outline" 
                  className="bg-white hover:bg-surface-2 border-protocall-premium-light text-protocall-blue hover:text-protocall-blue font-semibold shadow-sm hover:shadow-md transition-all"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Main Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white border-b border-border px-8 py-5 flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {finfluencerNavItems.find(item => item.matchPattern(location.pathname, location.search))?.title ||
                 organizerNavItems.find(item => item.matchPattern(location.pathname, location.search))?.title ||
                 'Finfluencer Dashboard'}
              </h1>
              <p className="text-sm text-subtle">
                {finfluencerNavItems.find(item => item.matchPattern(location.pathname, location.search))?.description ||
                 organizerNavItems.find(item => item.matchPattern(location.pathname, location.search))?.description ||
                 'Manage your content and followers'}
              </p>
            </div>
            {user && (
              <Badge className="bg-buy-muted text-buy-muted-foreground border-buy/30 px-4 py-2 text-sm font-semibold">
                <Star className="w-4 h-4 mr-2" />
                Verified Creator
              </Badge>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto bg-surface-2">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
