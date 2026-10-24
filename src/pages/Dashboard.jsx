import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
  Loader2,
  ArrowRight,
  GraduationCap,
  HandCoins,
  Sprout,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/context/AuthContext";
import { User, ChatRoom, Poll, marketAPI, AdvisorRecommendation } from "@/lib/apiClient";
import { createPageUrl } from "@/utils";
import StatTile from "@/components/common/StatTile";

import LiveStockTicker from "../components/stocks/LiveStockTicker";
import MarketOverviewPanel from "../components/dashboard/MarketOverviewPanel";
import SponsoredPanel from "../components/dashboard/SponsoredPanel";
import TopMovers from "../components/dashboard/TopMovers";
import CommunityPollPanel from "../components/dashboard/CommunityPollPanel";
import QuickActions from "../components/dashboard/QuickActions";
import StockHeatmap from "../components/dashboard/StockHeatmap";
import TrendingStocks from "../components/dashboard/TrendingStocks";
import FinInfluencers from "../components/dashboard/FinInfluencers";
import LatestNews from "../components/dashboard/LatestNews";
import RecentActivity from "../components/dashboard/RecentActivity";
import AdvisorRecommendations from "../components/dashboard/AdvisorRecommendations";
import ActivePolls from "../components/dashboard/ActivePolls";
import ReviewScroller from "../components/dashboard/ReviewScroller";
import PageFooter from "../components/footer/PageFooter";
import heroBull from "@/assets/dashboard/hero-bull.webp";

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
    recommendations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  // Market data fails independently of the rest of the dashboard.
  const [marketError, setMarketError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const [usersData, rooms, polls, recommendations, marketRes] = await Promise.all([
        User.list(null, 1, 0).catch(() => ({ count: 0 })),
        ChatRoom.list(null, 10, 0).catch(() => []),
        Poll.list(null, 10, 0).catch(() => []),
        AdvisorRecommendation.list(null, 5, 0).catch(() => []),
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
        recommendations: Array.isArray(recommendations) ? recommendations : [],
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
        <section className="relative isolate overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#250B8E_0%,#2C0DA5_70%,#3914BD_100%)] text-white shadow-sm">
          {/* Bull-market artwork. It carries its own indigo field on the left,
              and the section background continues that field. On desktop the
              art stops short of the right edge and fades out, so the tagline
              sits on clear colour beside the bull rather than over its head;
              on narrow screens the scrim keeps the bull from fighting the text. */}
          <img
            src={heroBull}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full select-none object-cover object-[72%_50%] lg:right-[9%] lg:w-[91%] lg:object-right lg:[mask-image:linear-gradient(to_right,#000_86%,transparent)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-protocall-ink/70 via-protocall-ink/30 to-transparent lg:from-protocall-ink/40 lg:via-transparent"
          />

          <div className="grid gap-5 p-5 sm:px-7 sm:py-6 lg:min-h-[184px] lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-[28px] sm:leading-9">
                Welcome back, {firstName}!
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-white/85">
                Stay updated with market trends, discussions, and community opportunities
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {HERO_ACTIONS.map(({ label, icon: Icon, to }, i) => (
                  <Link
                    key={label}
                    to={to}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                      i === 0
                        ? "bg-protocall-blue text-white ring-1 ring-inset ring-protocall-light/60 hover:bg-protocall-deep"
                        : "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <p className="text-sm font-semibold leading-snug [text-shadow:0_1px_8px_rgba(16,16,24,0.55)]">
                Better Insights.
                <br />
                Stronger Community.
                <br />
                Smarter Investing.
              </p>
              <Link
                to={createPageUrl("MyPortfolio")}
                className="group mt-4 inline-flex items-center gap-2 rounded-lg bg-buy px-5 py-2.5 text-sm font-bold text-buy-foreground shadow-[0_6px_20px_-6px_rgba(215,255,0,0.55)] transition-colors hover:bg-buy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Explore Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Live market ticker ---------- */}
        <LiveStockTicker />

        {/* ---------- Stat row ---------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
          <StatTile
            to={createPageUrl("Profile")}
            title="Active Traders"
            value={isLoading ? null : stats.totalTraders.toLocaleString("en-IN")}
            sub="+7.4% this week"
            icon={Users}
            variant="card"
            highlight
            isLoading={isLoading}
          />
          <StatTile
            to={createPageUrl("ChatRooms")}
            title="Live Chat Rooms"
            value={isLoading ? null : stats.activeRooms}
            sub="Active discussions"
            icon={MessageSquare}
            variant="card"
            isLoading={isLoading}
          />
          <StatTile
            to={createPageUrl("Polls")}
            title="Active Polls"
            value={isLoading ? null : stats.activePolls}
            sub="Community voting"
            icon={BarChart3}
            variant="card"
            isLoading={isLoading}
          />
          <StatTile
            to={createPageUrl("MyPortfolio")}
            title="Trending Stocks"
            value={isLoading ? null : stats.trendingStocksCount}
            sub="Market movers"
            icon={TrendingUp}
            variant="card"
            isLoading={isLoading}
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

        {/* ----------
            Trending, actions and heatmap in the main column; Advisor Picks
            and Active Polls in the side column (Base44 reference layout).
            The side column sticks while the longer main column scrolls.
           ---------- */}
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-3 xl:items-start">
          <div className="min-w-0 space-y-4 sm:space-y-5 xl:col-span-2">
            <section className="scroll-mt-6">
              <TrendingStocks stocks={stats.stocks} />
            </section>
            <QuickActions user={user} />
            <StockHeatmap polls={stats.polls} recommendations={stats.recommendations} />
          </div>
          <aside className="min-w-0 space-y-4 sm:space-y-5 xl:sticky xl:top-4">
            <AdvisorRecommendations recommendations={stats.recommendations} />
            <ActivePolls polls={stats.polls} />
          </aside>
        </div>

        {/* ---------- Market news + activity ---------- */}
        <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <LatestNews />
          </div>
          <div className="min-w-0">
            <RecentActivity />
          </div>
        </div>

        {/* ---------- FinInfluencers ---------- */}
        <FinInfluencers />

        {/* ---------- Reviews ---------- */}
        <ReviewScroller />

        {/* ---------- Footer strip ----------
            Plain text on the page background, as in the reference: no band
            of colour between the reviews and the footer. */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs font-medium text-subtle">
          <Zap className="h-3.5 w-3.5 fill-buy text-positive" />
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
