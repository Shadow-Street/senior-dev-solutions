import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
  Loader2,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  HandCoins,
  Sprout,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/context/AuthContext";
import { User, ChatRoom, Poll, marketAPI } from "@/lib/apiClient";
import { createPageUrl } from "@/utils";

import LiveStockTicker from "../components/stocks/LiveStockTicker";
import MarketOverviewPanel from "../components/dashboard/MarketOverviewPanel";
import SponsoredPanel from "../components/dashboard/SponsoredPanel";
import TopMovers from "../components/dashboard/TopMovers";
import CommunityPollPanel from "../components/dashboard/CommunityPollPanel";
import PageFooter from "../components/footer/PageFooter";

// Hero quick-actions, matching the reference banner.
const HERO_ACTIONS = [
  { label: "Learn", icon: GraduationCap, to: createPageUrl("News") },
  { label: "Discuss", icon: MessageSquare, to: createPageUrl("ChatRooms") },
  { label: "Pledge", icon: HandCoins, to: createPageUrl("PledgePool") },
  { label: "Grow", icon: Sprout, to: createPageUrl("MyPortfolio") },
];

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({
    totalTraders: 0,
    activeRooms: 0,
    activePolls: 0,
    trendingStocksCount: 0,
    stocks: [],
    gainers: [],
    losers: [],
    indices: [],
    polls: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  // Market data fails independently of the rest of the dashboard.
  const [marketError, setMarketError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const [usersData, rooms, polls, marketRes] = await Promise.all([
        User.list(null, 1, 0).catch(() => ({ count: 0 })),
        ChatRoom.list(null, 10, 0).catch(() => []),
        Poll.list(null, 10, 0).catch(() => []),
        marketAPI.getMarketData().then(r => r?.data).catch((e) => {
          setMarketError(e?.response?.data?.error || 'Live market data is unavailable');
          return null;
        }),
      ]);

      if (marketRes) setMarketError(null);
      const market = marketRes || { stocks: [], gainers: [], losers: [], indices: [] };

      setStats({
        totalTraders:
          usersData?.count || (Array.isArray(usersData) ? usersData.length : 0),
        activeRooms: Array.isArray(rooms) ? rooms.length : 0,
        activePolls: Array.isArray(polls) ? polls.length : 0,
        trendingStocksCount: market.stocks?.length || 0,
        stocks: market.stocks || [],
        gainers: market.gainers || [],
        losers: market.losers || [],
        indices: market.indices || [],
        polls: Array.isArray(polls) ? polls : [],
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = (user?.display_name || user?.name || "Trader").split(" ")[0];

  return (
    <div className="w-full bg-background">
      <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6">
        {/* ---------- Hero banner ---------- */}
        <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white">
          {/* Decorative market glow, purely presentational */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-60 lg:block"
            style={{
              background:
                "radial-gradient(60% 80% at 75% 50%, rgba(86,225,27,0.20) 0%, rgba(71,55,255,0.28) 45%, transparent 75%)",
            }}
          />
          <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, <span className="text-buy">{firstName}!</span>
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-white/80">
                Stay updated with market trends, discussions, and community opportunities
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {HERO_ACTIONS.map(({ label, icon: Icon, to }, i) => (
                  <Link
                    key={label}
                    to={to}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      i === 0
                        ? "bg-protocall-blue text-white hover:bg-protocall-deep"
                        : "bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-sm font-semibold leading-snug">
                Better Insights.
                <br />
                Stronger Community.
                <br />
                Smarter Investing.
              </p>
              <Link
                to={createPageUrl("MyPortfolio")}
                className="group mt-4 inline-flex items-center gap-2 rounded-lg bg-buy px-4 py-2 text-sm font-bold text-buy-foreground transition-colors hover:bg-buy-soft"
              >
                Explore Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Live market ticker ---------- */}
        <LiveStockTicker />

        {/* ---------- Stat row ---------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
          <StatCard
            to={createPageUrl("Profile")}
            title="Active Traders"
            value={isLoading ? null : stats.totalTraders.toLocaleString("en-IN")}
            sub="+7.4% this week"
            icon={Users}
            highlight
          />
          <StatCard
            to={createPageUrl("ChatRooms")}
            title="Live Chat Rooms"
            value={isLoading ? null : stats.activeRooms}
            sub="Active discussions"
            icon={MessageSquare}
          />
          <StatCard
            to={createPageUrl("Polls")}
            title="Active Polls"
            value={isLoading ? null : stats.activePolls}
            sub="Community voting"
            icon={BarChart3}
          />
          <StatCard
            to={createPageUrl("MyPortfolio")}
            title="Trending Stocks"
            value={isLoading ? null : stats.trendingStocksCount}
            sub="Market movers"
            icon={TrendingUp}
          />
        </div>

        {/* ---------- Market overview + sponsored ---------- */}
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <MarketOverviewPanel indices={stats.indices} error={marketError} />
          </div>
          <div className="min-w-0">
            <SponsoredPanel />
          </div>
        </div>

        {/* ---------- Movers + community poll ---------- */}
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <TopMovers gainers={stats.gainers} losers={stats.losers} isLoading={isLoading} error={marketError} />
          </div>
          <div className="min-w-0">
            <CommunityPollPanel polls={stats.polls} />
          </div>
        </div>

        {/* ---------- Footer strip ---------- */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-xs font-medium text-subtle">
          <Zap className="h-3.5 w-3.5 text-buy" />
          <span>Join the conversation</span>
          <span aria-hidden="true" className="text-muted-foreground">·</span>
          <span>Share your insights</span>
          <span aria-hidden="true" className="text-muted-foreground">·</span>
          <span>Be a part of PROTOCALL</span>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}

// `highlight` renders the green growth tile; the rest are white cards.
function StatCard({ to, title, value, sub, icon: Icon, highlight = false }) {
  return (
    <Card
      className={`group overflow-hidden border shadow-sm transition-shadow hover:shadow-md ${
        highlight ? "border-transparent bg-buy" : "border-border bg-card"
      }`}
    >
      <Link to={to} className="block">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                highlight ? "bg-buy-foreground/10" : "bg-premium-muted"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${highlight ? "text-buy-foreground" : "text-primary"}`}
              />
            </span>
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                highlight ? "text-buy-foreground/60" : "text-muted-foreground"
              }`}
            />
          </div>

          <p
            className={`mt-3 text-xs font-medium ${
              highlight ? "text-buy-foreground/80" : "text-subtle"
            }`}
          >
            {title}
          </p>

          {value === null ? (
            <div
              className={`mt-1 h-7 w-20 animate-pulse rounded ${
                highlight ? "bg-buy-foreground/15" : "bg-surface-2"
              }`}
            />
          ) : (
            <p
              className={`mt-0.5 text-2xl font-bold leading-tight ${
                highlight ? "text-buy-foreground" : "text-foreground"
              }`}
            >
              {value}
            </p>
          )}

          <p
            className={`mt-0.5 text-[11px] ${
              highlight ? "font-semibold text-buy-foreground/70" : "text-muted-foreground"
            }`}
          >
            {sub}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}
