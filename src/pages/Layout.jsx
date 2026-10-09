
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
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  BarChart3,
  Briefcase,
  MessageSquare,
  Shield,
  Star,
  Sparkles,
  Bell,
  ChevronDown,
} from "lucide-react";
import { Toaster } from "sonner";

import { useAuth } from "@/components/context/AuthContext";
import { useSubscription } from "@/components/hooks/useSubscription";
import DashboardSearch from "@/components/dashboard/DashboardSearch";

// Single source of truth for the primary navigation.
// `comingSoon` items render a badge and do not navigate.
const NAV_ITEMS = [
  { key: "dashboard", title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { key: "my_portfolio", title: "My Portfolio", url: createPageUrl("MyPortfolio"), icon: Briefcase },
  { key: "chat_rooms", title: "Stock Chat Rooms", url: createPageUrl("ChatRooms"), icon: MessageSquare },
  { key: "community_poll", title: "Community Poll", url: createPageUrl("Polls"), icon: BarChart3 },
  { key: "advisors", title: "Advisors", url: createPageUrl("Advisors"), icon: Shield },
  { key: "influencers", title: "Influencers", url: createPageUrl("Finfluencers"), icon: Star, comingSoon: true },
  { key: "subscription", title: "Subscription Plans", url: createPageUrl("Subscription"), icon: Sparkles },
];

const COMING_SOON_BADGE =
  "ml-auto shrink-0 border-transparent bg-protocall-premium-light px-1.5 text-[10px] font-semibold uppercase tracking-tight text-protocall-premium-text";

// Render helper (not a component) so it follows the codebase's no-propTypes style.
const renderComingSoonItem = (item) => {
  const Icon = item.icon;
  return (
    <SidebarMenuItem key={item.key}>
      <div
        aria-disabled="true"
        title={`${item.title} — coming soon`}
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/60"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.title}</span>
        <Badge variant="outline" className={COMING_SOON_BADGE}>
          Soon
        </Badge>
      </div>
    </SidebarMenuItem>
  );
};

function InnerLayout({ children, currentPageName }) {
  const location = useLocation();
  const { user } = useAuth();
  const { subscription } = useSubscription();

  // Shown under the name in the sidebar footer, e.g. "Premium Member".
  const planName = subscription?.plan_type || subscription?.plan || "";
  const planLabel = planName
    ? `${planName.charAt(0).toUpperCase()}${planName.slice(1)} Member`
    : "Free Member";

  const displayUser = user || {
    id: "guest",
    display_name: "Guest",
    email: "",
    app_role: "guest",
    roles: [],
    profile_image_url: null,
  };

  // Pages that render their own full-page chrome and must not get the app shell.
  const isLandingPage =
    location.pathname === createPageUrl("Landing") ||
    location.pathname.toLowerCase() === "/landing" ||
    currentPageName === "Landing";

  const PUBLIC_CONTENT_PAGES = [
    "Blogs",
    "BlogArticle",
    "News",
    "Contact",
    "ContactSupport",
    "Privacy",
    "Terms",
    "Cookies",
    "RiskDisclosure",
  ];
  const isPublicContentPage = PUBLIC_CONTENT_PAGES.some(
    (page) => location.pathname === createPageUrl(page) || currentPageName === page
  );

  const isSuperAdminPage =
    location.pathname === createPageUrl("SuperAdmin") || currentPageName === "SuperAdmin";

  // Portal pages ship their own navigation shell. Wrapping them in the app
  // sidebar would render two sidebars and two headers on the same screen.
  const PORTAL_PAGES = ["AdvisorDashboard"];
  const isPortalPage = PORTAL_PAGES.some(
    (page) => location.pathname === createPageUrl(page) || currentPageName === page
  );

  if (isLandingPage || isPublicContentPage || isSuperAdminPage || isPortalPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: "sonner-toast",
          style: {
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
            border: "none",
          },
        }}
        richColors={false}
      />

      <SidebarProvider defaultOpen={true}>
        {/*
          Layout contract (fixes the zoom / resize drift):
          - The shell is the ONLY element that owns viewport height (h-dvh).
          - Exactly one scroll container: <main>. Nothing inside may use
            h-screen/min-h-screen, which previously produced nested scrollers.
          - The content column is min-w-0 so a wide child (table, ticker) shrinks
            instead of pushing the sidebar off-screen.
        */}
        <div className="flex h-dvh w-full overflow-hidden bg-background">
          <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="p-0">
              <div className="flex min-h-[112px] flex-col items-center justify-center gap-1 bg-sidebar-dark p-4 text-sidebar-foreground">
                <Shield className="h-9 w-9" />
                <div className="text-xl font-bold tracking-tighter">PROTOCALL</div>
                <div className="text-[10px] uppercase tracking-widest text-sidebar-muted-foreground">
                  Financial Networking
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
              <SidebarGroup>
                <SidebarGroupLabel className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-muted-foreground">
                  Trading Hub
                </SidebarGroupLabel>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    if (item.comingSoon) return renderComingSoonItem(item);
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          asChild
                          className={`group/nav mb-1 rounded-xl text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                            isActive
                              ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-md"
                              : ""
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon
                              className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                                isActive ? "text-buy" : "group-hover/nav:text-buy"
                              }`}
                            />
                            <span className="truncate">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-3">
              <Link
                to={createPageUrl("Profile")}
                className="flex items-center gap-3 rounded-lg bg-sidebar-dark px-3 py-2 transition-colors hover:bg-sidebar-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {displayUser.display_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {displayUser.display_name || "User"}
                  </p>
                  <p className="truncate text-xs text-sidebar-muted-foreground">
                    {planLabel}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-muted-foreground" />
              </Link>
            </SidebarFooter>
          </Sidebar>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="shrink-0 border-b border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
                <SidebarTrigger className="shrink-0 text-foreground md:hidden" />

                <DashboardSearch className="order-last w-full min-w-0 sm:order-none sm:max-w-md" />

                <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    aria-label="Notifications"
                    className="relative rounded-full p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-protocall-sell-text px-1 text-[10px] font-bold leading-none text-white">
                      3
                    </span>
                  </button>

                  <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground lg:inline-flex">
                    <span className="h-2 w-2 rounded-full bg-buy" />
                    Live Market
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </span>

                  <Link
                    to={createPageUrl("Profile")}
                    className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-surface-2"
                    aria-label="Open profile"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {displayUser.display_name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </Link>
                </div>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto bg-background">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return <InnerLayout currentPageName={currentPageName}>{children}</InnerLayout>;
}
