import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, Link } from "react-router-dom";
import { TrendingUp, Users, MessageSquare, BarChart3, Activity, Loader2, Lock, Star, Crown, Zap, BarChart, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/context/AuthContext";
import { useSubscription } from "@/components/hooks/useSubscription";
import { User, ChatRoom, Poll, marketAPI, AdvisorRecommendation } from "@/lib/apiClient";

import MarketOverview from "../components/dashboard/MarketOverview";
import QuickActions from "../components/dashboard/QuickActions";
import TrendingStocks from "../components/dashboard/TrendingStocks";
import StockHeatmap from "../components/dashboard/StockHeatmap";
import FinInfluencers from "../components/dashboard/FinInfluencers";
import LatestNews from "../components/dashboard/LatestNews";
import ActivePolls from "../components/dashboard/ActivePolls";
import RecentActivity from "../components/dashboard/RecentActivity";
import AdvisorRecommendations from "../components/dashboard/AdvisorRecommendations";
import LiveStockTicker from "../components/stocks/LiveStockTicker";
import PageFooter from "../components/footer/PageFooter";
import AdDisplay from "../components/dashboard/AdDisplay";
import ReviewScroller from "../components/dashboard/ReviewScroller";
import AnnouncementBanner from "../components/dashboard/AnnouncementBanner";

export default function Dashboard() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { hasPremiumAccess, hasVipAccess, isLoading: subLoading, subscription } = useSubscription();

  const [stats, setStats] = useState({
    totalTraders: 0,
    activeRooms: 0,
    activePolls: 0,
    trendingStocksCount: 0,
    stocks: [],
    chatRooms: [],
    polls: [],
    recommendations: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // Don't set full page loading on refresh, only initial
      // setIsLoading(true); 

      const [usersData, rooms, polls, marketRes, recommendations] = await Promise.all([
        User.list(null, 1, 0).catch(() => ({ count: 1247 })),
        ChatRoom.list(null, 10, 0).catch(() => []),
        Poll.list(null, 10, 0).catch(() => []),
        marketAPI.getMarketData().catch(() => ({ data: { gainers: [], stocks: [] } })),
        AdvisorRecommendation.list(null, 5, 0).catch(() => [])
      ]);

      const marketToUse = marketRes?.data || { gainers: [], stocks: [] };

      setStats({
        totalTraders: usersData?.count || (Array.isArray(usersData) ? usersData.length : 1247),
        activeRooms: Array.isArray(rooms) ? rooms.length : 0,
        activePolls: Array.isArray(polls) ? polls.length : 0,
        trendingStocksCount: marketToUse.gainers?.length || 0,
        stocks: marketToUse.gainers?.length > 0 ? marketToUse.gainers : marketToUse.stocks, // Prefer gainers for trending
        chatRooms: Array.isArray(rooms) ? rooms : [],
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
    // Poll for updates every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background border-0">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = ['admin', 'super_admin'].includes(user?.app_role);
  const isPremium = hasPremiumAccess?.() || false;
  const isVIP = hasVipAccess?.() || false;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnnouncementBanner />

        {/* Dynamic Welcome Banner */}
        <div className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${isVIP ? 'bg-premium-gradient' :
          isPremium ? 'bg-brand-gradient' :
            'bg-gradient-to-r from-protocall-ink via-protocall-deep to-protocall-blue'
          }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-32 -translate-y-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">
                  Welcome back, {user?.display_name || user?.name || 'Trader'}!
                </h1>
                {isVIP && <Crown className="w-6 h-6 text-protocall-premium-light animate-pulse" />}
                {isPremium && !isVIP && <Star className="w-6 h-6 text-protocall-light" />}
              </div>
              <p className="text-white/80 text-lg">
                {isVIP ? "You have unlocked all VIP insights and direct advisor access." :
                  isPremium ? "Enjoy your premium features and enhanced market analytics." :
                    "Unlock premium insights to accelerate your trading journey."}
              </p>
            </div>
            {!isPremium && (
              <Link to="/subscription" className="bg-protocall-card text-protocall-premium-text px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-protocall-premium-bg transition-colors shadow-lg group">
                Upgrade Now <Zap className="w-4 h-4 text-protocall-blue group-hover:scale-110 transition-transform" />
              </Link>
            )}
          </div>
        </div>

        <LiveStockTicker />

        {/* Dynamic Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Traders"
            value={stats.totalTraders.toLocaleString()}
            sub="Community strength"
            icon={<Users className="w-5 h-5" />}
            color="bg-buy text-buy-foreground"
            chip="bg-protocall-ink/10"
            overlay="bg-protocall-ink"
          />
          <StatCard
            title="Live Chat Rooms"
            value={stats.activeRooms}
            sub="Active discussions"
            icon={<MessageSquare className="w-5 h-5" />}
            color="bg-protocall-blue text-white"
          />
          <StatCard
            title="Active Polls"
            value={stats.activePolls}
            sub="Community sentiment"
            icon={<BarChart3 className="w-5 h-5" />}
            color="bg-primary text-primary-foreground"
          />
          <StatCard
            title="Trending Stocks"
            value={stats.trendingStocksCount}
            sub="Market momentum"
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-protocall-deep text-white"
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Feed */}
          <div className="lg:col-span-8 space-y-6">
            <MarketOverview stocks={stats.stocks} />

            {/* VIP/Premium Analytics Section */}
            {(isPremium || isVIP) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-protocall-deep to-protocall-blue p-6 text-white h-full min-h-[160px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <BarChart className="w-5 h-5" /> Advanced Analytics
                          </h3>
                          <Badge className="bg-white/20 text-white border-0">Premium</Badge>
                        </div>
                        <p className="text-white/80 text-sm mb-4">Deep dive into market sentiment and volume profiles.</p>
                      </div>
                      <Link to="/samples/analytics" className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all">
                        View Detailed Reports <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-protocall-grape to-protocall-deep p-6 text-white h-full min-h-[160px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5" /> Advisor Signals
                          </h3>
                          {isVIP ? <Badge className="bg-white/20 text-white border-0">VIP Access</Badge> : <Lock className="w-4 h-4 text-white/50" />}
                        </div>
                        <p className="text-white/80 text-sm mb-4">Real-time buy/sell pressure signals from SEBI advisors.</p>
                      </div>
                      {isVIP ? (
                        <Link to="/AdvisorRecommendations" className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all">
                          Check Live Signals <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <Link to="/subscription" className="inline-flex items-center gap-2 text-sm font-semibold opacity-70">
                          Upgrade to VIP <Lock className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-protocall-ink border-0 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-protocall-blue/25 to-protocall-grape/25 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-8 relative z-10 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Unlock Premium Insights</h3>
                  <p className="text-protocall-sidebar-muted mb-6 max-w-md mx-auto">Get access to SEBI-certified advisor signals, advanced analytics, and exclusive VIP chat rooms.</p>
                  <Link to="/subscription" className="bg-protocall-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-protocall-deep transition-all inline-block shadow-lg shadow-protocall-deep/40">
                    Upgrade Your Plan
                  </Link>
                </CardContent>
              </Card>
            )}

            <QuickActions user={user} />
            <StockHeatmap polls={stats.polls} recommendations={stats.recommendations} />
            <TrendingStocks stocks={stats.stocks} />
            <FinInfluencers />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <AdDisplay placement="dashboard" className="w-full" />

            {/* Admin Quick Moderation Widget */}
            {isAdmin && (
              <Card className="border-protocall-premium-light bg-protocall-premium-bg">
                <CardContent className="p-4">
                  <h3 className="font-bold text-protocall-premium-text flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4" /> Admin Operations
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/admin" className="text-[10px] bg-card border border-protocall-premium-light p-2 rounded text-center text-protocall-premium-text hover:bg-protocall-premium-light/40 font-medium uppercase tracking-tight">Moderate Content</Link>
                    <Link to="/admin" className="text-[10px] bg-card border border-protocall-premium-light p-2 rounded text-center text-protocall-premium-text hover:bg-protocall-premium-light/40 font-medium uppercase tracking-tight">Manage Users</Link>
                    <Link to="/admin" className="text-[10px] bg-card border border-protocall-premium-light p-2 rounded text-center text-protocall-premium-text hover:bg-protocall-premium-light/40 font-medium uppercase tracking-tight">Poll Settle</Link>
                    <Link to="/admin" className="text-[10px] bg-card border border-protocall-premium-light p-2 rounded text-center text-protocall-premium-text hover:bg-protocall-premium-light/40 font-medium uppercase tracking-tight">Settings</Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <AdvisorRecommendations recommendations={stats.recommendations} />
            <ActivePolls polls={stats.polls} />
            <RecentActivity />
            <LatestNews />
          </div>
        </div>

        <ReviewScroller />
      </div>

      <PageFooter />
    </div>
  );
}

function StatCard({ title, value, sub, icon, color, chip = "bg-white/20", overlay = "bg-white" }) {
  return (
    <Card className={`${color} border-0 shadow-lg overflow-hidden relative group`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${overlay} opacity-10 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform`}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs mt-1 opacity-70">{sub}</p>
          </div>
          <div className={`w-12 h-12 ${chip} rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}