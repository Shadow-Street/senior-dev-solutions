
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Sidebar,
  SidebarContent, // This component is not explicitly used in the outline, but Sidebar, Header, Footer are.
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
  ShieldCheck, 
  Calendar, 
  LogOut, 
  User as UserIcon, 
  ChevronDown,
  Home,
  ArrowLeft,
  FileText,
  CreditCard,
  Users,
  DollarSign,
  BarChart3,
  CalendarDays,
  TrendingUp,
  Wallet,
  Star,
  LayoutDashboard,
  Crown,
  Activity,
  Target // Added Target icon for pledge sessions
} from 'lucide-react';
import { User, PlatformSetting, AdvisorPledgeAccessRequest, Advisor } from '@/api/entities'; // Added PlatformSetting

export default function AdvisorLayout({ children, currentPageName }) { // Renamed activePage to currentPageName
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const [organizerOpen, setOrganizerOpen] = useState(true);
  const [pledgeOpen, setPledgeOpen] = useState(true);
  const [advisorPledgeFeatureEnabled, setAdvisorPledgeFeatureEnabled] = useState(false); // New state
  const [advisorPledgeAccessRequest, setAdvisorPledgeAccessRequest] = useState(null); // New state, implied by usage

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadUser = async () => {
      try {
        const currentUser = await User.me({ signal: abortController.signal }).catch((err) => {
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            return null;
          }
          console.error("Error loading user:", err);
          return null;
        });
        
        if (isMounted && !abortController.signal.aborted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error("Error loading user:", error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // Load feature toggle setting and pledge access request
    const loadSettingsAndAccess = async () => {
      if (!user?.id) {
        return;
      }

      try {
        const hasAdvisorRole = user.app_role === 'advisor' || (user.roles && user.roles.includes('advisor'));
        
        // ✅ Make parallel API calls instead of sequential
        const apiCalls = [
          PlatformSetting.list()
            .then(settings => ({ type: 'settings', data: settings }))
            .catch(() => ({ type: 'settings', data: [] }))
        ];
        
        if (hasAdvisorRole) {
          apiCalls.push(
            Advisor.filter({ user_id: user.id })
              .then(profiles => ({ type: 'advisor', data: profiles }))
              .catch(() => ({ type: 'advisor', data: [] }))
          );
        }
        
        // ✅ Wait for all API calls in parallel
        const results = await Promise.all(apiCalls);
        
        if (!isMounted || abortController.signal.aborted) return;
        
        // Process settings
        const settingsResult = results.find(r => r.type === 'settings');
        if (settingsResult) {
          const pledgeFeatureSetting = settingsResult.data.find(s => s.setting_key === 'advisor_pledge_management_enabled');
          setAdvisorPledgeFeatureEnabled(pledgeFeatureSetting?.setting_value === 'true');
        }
        
        // Process advisor profile and get access request
        const advisorResult = results.find(r => r.type === 'advisor');
        if (advisorResult && advisorResult.data.length > 0) {
          const advisorProfile = advisorResult.data[0];
          
          // Now get pledge access request
          const accessRequests = await AdvisorPledgeAccessRequest.filter({
            advisor_id: advisorProfile.id,
            status: 'approved'
          }, '-created_date', 1).catch(() => []);
          
          if (isMounted && !abortController.signal.aborted) {
            if (Array.isArray(accessRequests) && accessRequests.length > 0) {
              setAdvisorPledgeAccessRequest(accessRequests[0]);
            } else {
              setAdvisorPledgeAccessRequest(null);
            }
          }
        } else {
          if (isMounted && !abortController.signal.aborted) {
            setAdvisorPledgeAccessRequest(null);
          }
        }

      } catch (error) {
        if (!error?.message?.includes('aborted') && error?.name !== 'AbortError') {
          console.error('Error loading feature settings or pledge access request:', error);
        }
        if (isMounted && !abortController.signal.aborted) {
          setAdvisorPledgeFeatureEnabled(false);
          setAdvisorPledgeAccessRequest(null);
        }
      }
    };
    
    loadSettingsAndAccess();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id]);


  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const advisorNavItems = [
    { 
      key: 'advisor-overview', 
      title: 'Overview', 
      url: createPageUrl('AdvisorDashboard') + '?section=overview', 
      icon: LayoutDashboard,
      description: 'Dashboard stats & overview',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorDashboard') && (!params.get('section') || params.get('section') === 'overview');
      },
    },
    { 
      key: 'advisor-my-plans', 
      title: 'My Plans', 
      url: createPageUrl('AdvisorDashboard') + '?section=plans', 
      icon: Crown,
      description: 'Manage subscription plans',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorDashboard') && params.get('section') === 'plans';
      },
    },
    { 
      key: 'advisor-subscribers', 
      title: 'Subscribers', 
      url: createPageUrl('AdvisorDashboard') + '?section=subscribers', 
      icon: Users,
      description: 'View all subscribers',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorDashboard') && params.get('section') === 'subscribers';
      },
    },
    { 
      key: 'advisor-posts', 
      title: 'Posts', 
      url: createPageUrl('AdvisorDashboard') + '?section=posts', 
      icon: FileText,
      description: 'Manage your posts',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorDashboard') && params.get('section') === 'posts';
      },
    },
    { 
      key: 'advisor-financials', 
      title: 'Financials', 
      url: createPageUrl('AdvisorDashboard') + '?section=financials', 
      icon: DollarSign,
      description: 'Earnings & payouts',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorDashboard') && params.get('section') === 'financials';
      },
    },
  ];

  const pledgeNavItems = [
    { 
      key: 'pledge-overview', 
      title: 'Overview', 
      url: createPageUrl('AdvisorPledgeManagement') + '?section=overview', 
      icon: LayoutDashboard,
      description: 'Pledge management overview',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorPledgeManagement') && (!params.get('section') || params.get('section') === 'overview');
      },
    },
    { 
      key: 'pledge-sessions', 
      title: 'Sessions', 
      url: createPageUrl('AdvisorPledgeManagement') + '?section=sessions', 
      icon: Target,
      description: 'Manage pledge sessions',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorPledgeManagement') && params.get('section') === 'sessions';
      },
    },
    { 
      key: 'pledge-executions', 
      title: 'Executions', 
      url: createPageUrl('AdvisorPledgeManagement') + '?section=executions', 
      icon: TrendingUp,
      description: 'View execution history',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorPledgeManagement') && params.get('section') === 'executions';
      },
    },
    { 
      key: 'pledge-analytics', 
      title: 'Analytics', 
      url: createPageUrl('AdvisorPledgeManagement') + '?section=analytics', 
      icon: BarChart3,
      description: 'Performance analytics',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorPledgeManagement') && params.get('section') === 'analytics';
      },
    },
    { 
      key: 'pledge-financials', 
      title: 'Financials', 
      url: createPageUrl('AdvisorPledgeManagement') + '?section=financials', 
      icon: DollarSign,
      description: 'Commission & payouts',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('AdvisorPledgeManagement') && params.get('section') === 'financials';
      },
    },
  ];

  const organizerNavItems = [
    { 
      key: 'organizer-overview', 
      title: 'Overview', 
      url: createPageUrl('OrganizerDashboard') + '?section=overview', 
      icon: LayoutDashboard,
      description: 'Dashboard stats & overview',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('OrganizerDashboard') && (!params.get('section') || params.get('section') === 'overview');
      },
    },
    { 
      key: 'organizer-events', 
      title: 'My Events', 
      url: createPageUrl('OrganizerDashboard') + '?section=events', 
      icon: CalendarDays,
      description: 'Manage events',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('OrganizerDashboard') && params.get('section') === 'events';
      },
    },
    { 
      key: 'organizer-analytics', 
      title: 'Analytics', 
      url: createPageUrl('OrganizerDashboard') + '?section=analytics', 
      icon: TrendingUp,
      description: 'Event performance',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('OrganizerDashboard') && params.get('section') === 'analytics';
      },
    },
    { 
      key: 'organizer-financials', 
      title: 'Financials', 
      url: createPageUrl('OrganizerDashboard') + '?section=financials', 
      icon: DollarSign,
      description: 'Revenue & payouts',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('OrganizerDashboard') && params.get('section') === 'financials';
      },
    },
    { 
      key: 'organizer-reviews', 
      title: 'Reviews', 
      url: createPageUrl('OrganizerDashboard') + '?section=reviews', 
      icon: Star,
      description: 'Event reviews',
      matchPattern: (pathname, search) => {
        const params = new URLSearchParams(search);
        return pathname === createPageUrl('OrganizerDashboard') && params.get('section') === 'reviews';
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Clone children and pass user as prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { layoutUser: user });
    }
    return child;
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-screen overflow-hidden">
          {user && (
            <div className="px-4 py-6 border-b border-gray-200 flex-shrink-0">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt={user.display_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{user.display_name?.charAt(0)?.toUpperCase() || 'A'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm leading-tight">{user.display_name || 'Advisor'}</p>
                    <p className="text-xs text-white/80 truncate">{user.email}</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs w-full justify-center py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Advisor
                </Badge>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              <Collapsible open={advisorOpen} onOpenChange={setAdvisorOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-sm text-gray-900">Advisor Dashboard</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${advisorOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="ml-6 space-y-1"> {/* Added ml-6 for indentation */}
                    {advisorNavItems.map((item) => {
                      const isActive = item.matchPattern(location.pathname, location.search);
                      return (
                        <Link key={item.url} to={item.url}> {/* Changed key to item.url */}
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${ // Simplified styling
                            isActive 
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md' 
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ONLY SHOW PLEDGE MANAGEMENT IF FEATURE IS ENABLED AND ACCESS IS APPROVED */}
              {advisorPledgeFeatureEnabled && advisorPledgeAccessRequest?.status === 'approved' && (
                <Collapsible open={pledgeOpen} onOpenChange={setPledgeOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-sm text-gray-900">Pledge Management</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${pledgeOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <div className="ml-6 space-y-1"> {/* Added ml-6 for indentation */}
                      {pledgeNavItems.map((item) => {
                        const isActive = item.matchPattern(location.pathname, location.search);
                        return (
                          <Link key={item.url} to={item.url}> {/* Changed key to item.url */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${ // Simplified styling
                              isActive 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md' 
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}>
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Collapsible open={organizerOpen} onOpenChange={setOrganizerOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-sm text-gray-900">Event Organizer</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${organizerOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="ml-6 space-y-1"> {/* Added ml-6 for indentation */}
                    {organizerNavItems.map((item) => {
                      const isActive = item.matchPattern(location.pathname, location.search);
                      return (
                        <Link 
                          key={item.url} // Changed key to item.url
                          to={item.url} 
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${ // Simplified styling
                            isActive 
                              ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold shadow-md' 
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 flex-shrink-0">
            <Link to={createPageUrl('Dashboard')}>
              <Button 
                variant="outline" 
                className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 text-blue-700 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go to Main Dashboard</span>
              </Button>
            </Link>
          </div>

          <SidebarFooter className="border-t border-gray-200 p-4 flex-shrink-0"> {/* Replaced div with SidebarFooter */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user.profile_image_url ? (
                        <img src={user.profile_image_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        user.display_name?.charAt(0)?.toUpperCase() || 'A'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name || 'Advisor'}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Profile")} className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </SidebarFooter>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden h-screen">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100 px-8 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-bold text-base text-purple-900">Advisor Portal</span>
              </div>
              <Link to={createPageUrl('Dashboard')}>
                <Button 
                  variant="outline" 
                  className="bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-900 font-semibold shadow-sm hover:shadow-md transition-all"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Main Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between flex-shrink-0">
            <div>
              {(() => {
                const advisorMatch = advisorNavItems.find(item => item.matchPattern(location.pathname, location.search));
                const pledgeMatch = pledgeNavItems.find(item => item.matchPattern(location.pathname, location.search));
                const organizerMatch = organizerNavItems.find(item => item.matchPattern(location.pathname, location.search));
                
                let parentSection = '';
                let currentTitle = 'Advisor Dashboard';
                let currentDescription = 'Manage your advisor activities';
                
                if (advisorMatch) {
                  parentSection = 'Advisor Dashboard';
                  currentTitle = advisorMatch.title;
                  currentDescription = advisorMatch.description;
                } else if (pledgeMatch) {
                  parentSection = 'Pledge Management';
                  currentTitle = pledgeMatch.title;
                  currentDescription = pledgeMatch.description;
                } else if (organizerMatch) {
                  parentSection = 'Event Organizer';
                  currentTitle = organizerMatch.title;
                  currentDescription = organizerMatch.description;
                }
                
                return (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                        {parentSection}
                      </span>
                      {currentTitle !== parentSection && (
                        <>
                          <span className="text-gray-400">›</span>
                          <span className="text-xs font-medium text-gray-500">{currentTitle}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {currentTitle}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentDescription}
                    </p>
                  </>
                );
              })()}
            </div>
            {user && (
              <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 mr-2" />
                SEBI Registered
              </Badge>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {childrenWithProps}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
