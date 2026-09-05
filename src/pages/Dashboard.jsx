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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 border-0">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isAdmin = ['admin', 'super_admin'].includes(user?.app_role);
  const isPremium = hasPremiumAccess?.() || false;
  const isVIP = hasVipAccess?.() || false;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnnouncementBanner />

        {/* Dynamic Welcome Banner */}
        <div className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${isVIP ? 'bg-gradient-to-r from-amber-500 via-yellow-600 to-orange-600' :
          isPremium ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600' :
            'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
          }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-32 -translate-y-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">
                  Welcome back, {user?.display_name || user?.name || 'Trader'}!
                </h1>
                {isVIP && <Crown className="w-6 h-6 text-yellow-300 animate-pulse" />}
                {isPremium && !isVIP && <Star className="w-6 h-6 text-blue-300" />}
              </div>
              <p className="text-blue-100 text-lg opacity-90">
                {isVIP ? "You have unlocked all VIP insights and direct advisor access." :
                  isPremium ? "Enjoy your premium features and enhanced market analytics." :
                    "Unlock premium insights to accelerate your trading journey."}
              </p>
            </div>
            {!isPremium && (
              <Link to="/subscription" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg group">
                Upgrade Now <Zap className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
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
            color="bg-emerald-500"
          />
          <StatCard
            title="Live Chat Rooms"
            value={stats.activeRooms}
            sub="Active discussions"
            icon={<MessageSquare className="w-5 h-5" />}
            color="bg-blue-500"
          />
          <StatCard
            title="Active Polls"
            value={stats.activePolls}
            sub="Community sentiment"
            icon={<BarChart3 className="w-5 h-5" />}
            color="bg-indigo-500"
          />
          <StatCard
            title="Trending Stocks"
            value={stats.trendingStocksCount}
            sub="Market momentum"
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-orange-500"
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
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white h-full min-h-[160px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <BarChart className="w-5 h-5" /> Advanced Analytics
                          </h3>
                          <Badge className="bg-white/20 text-white border-0">Premium</Badge>
                        </div>
                        <p className="text-indigo-100 text-sm mb-4">Deep dive into market sentiment and volume profiles.</p>
                      </div>
                      <Link to="/samples/analytics" className="inline-flex items-center gap-2 text-sm font-semibold hover:gap-3 transition-all">
                        View Detailed Reports <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white h-full min-h-[160px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5" /> Advisor Signals
                          </h3>
                          {isVIP ? <Badge className="bg-white/20 text-white border-0">VIP Access</Badge> : <Lock className="w-4 h-4 text-white/50" />}
                        </div>
                        <p className="text-orange-100 text-sm mb-4">Real-time buy/sell pressure signals from SEBI advisors.</p>
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
              <Card className="bg-slate-900 border-0 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-8 relative z-10 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Unlock Premium Insights</h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">Get access to SEBI-certified advisor signals, advanced analytics, and exclusive VIP chat rooms.</p>
                  <Link to="/subscription" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all inline-block shadow-lg shadow-blue-900/40">
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
              <Card className="border-red-100 bg-red-50/30">
                <CardContent className="p-4">
                  <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4" /> Admin Operations
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/admin" className="text-[10px] bg-white border border-red-200 p-2 rounded text-center hover:bg-red-50 font-medium uppercase tracking-tight">Moderate Content</Link>
                    <Link to="/admin" className="text-[10px] bg-white border border-red-200 p-2 rounded text-center hover:bg-red-50 font-medium uppercase tracking-tight">Manage Users</Link>
                    <Link to="/admin" className="text-[10px] bg-white border border-red-200 p-2 rounded text-center hover:bg-red-50 font-medium uppercase tracking-tight">Poll Settle</Link>
                    <Link to="/admin" className="text-[10px] bg-white border border-red-200 p-2 rounded text-center hover:bg-red-50 font-medium uppercase tracking-tight">Settings</Link>
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

function StatCard({ title, value, sub, icon, color }) {
  return (
    <Card className={`${color} text-white border-0 shadow-lg overflow-hidden relative group`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 text-white">{value}</p>
            <p className="text-white/60 text-xs mt-1">{sub}</p>
          </div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
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