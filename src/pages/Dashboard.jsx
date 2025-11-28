import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { TrendingUp, Users, MessageSquare, BarChart3, Activity } from "lucide-react";

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
  
  // Mock user for UI purposes - no authentication required
  const mockUser = {
    id: "demo-user",
    display_name: "Demo User",
    email: "demo@protocall.com",
    app_role: "trader"
  };

  const [stats, setStats] = useState({
    totalTraders: 1247,
    activeRooms: 6,
    activePolls: 4,
    trendingStocks: 10,
    stocks: [],
    chatRooms: [],
    polls: [],
    recommendations: [],
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // No data loading - just show UI with mock data
  useEffect(() => {
    // Set loading to false immediately - no API calls
    setIsLoading(false);
  }, []);

  const trendingStocksCount = stats.trendingStocks;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <AnnouncementBanner />

        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {mockUser.display_name || 'Trader'}!
            </h1>
            <p className="text-blue-100 text-lg">Here's what's happening in your investment community today.</p>
          </div>
          <div className="absolute bottom-4 right-8 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6 text-yellow-900" />
          </div>
        </div>

        <LiveStockTicker />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-green-500 text-white border-0 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Active Traders</p>
                  <p className="text-2xl font-bold mt-1">1,247</p>
                  <p className="text-green-200 text-xs">+47 this week</p>
                </div>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500 text-white border-0 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Live Chat Rooms</p>
                  <p className="text-2xl font-bold mt-1">{stats.activeRooms}</p>
                  <p className="text-blue-200 text-xs">Active discussions</p>
                </div>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500 text-white border-0 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Active Polls</p>
                  <p className="text-2xl font-bold mt-1">{stats.activePolls}</p>
                  <p className="text-purple-200 text-xs">Community voting</p>
                </div>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500 text-white border-0 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Trending Stocks</p>
                  <p className="text-2xl font-bold mt-1">{trendingStocksCount}</p>
                  <p className="text-orange-200 text-xs">Market movers</p>
                </div>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MarketOverview stocks={stats.stocks || []} />
            <QuickActions user={mockUser} />
            <StockHeatmap polls={stats.polls || []} recommendations={stats.recommendations || []} />
            <TrendingStocks stocks={stats.stocks || []} />
            <FinInfluencers />
          </div>

          <div className="space-y-6">
            <AdDisplay placement="dashboard" className="w-full" />
            <AdvisorRecommendations recommendations={stats.recommendations || []} />
            <ActivePolls polls={stats.polls || []} />
            <RecentActivity />
            <LatestNews />
          </div>
        </div>

        <div className="lg:hidden space-y-6">
          <AdDisplay placement="dashboard" className="w-full" />
          <MarketOverview stocks={stats.stocks || []} />
          <QuickActions user={mockUser} />
          <StockHeatmap polls={stats.polls || []} recommendations={stats.recommendations || []} />
          <AdvisorRecommendations recommendations={stats.recommendations || []} />
          <TrendingStocks stocks={stats.stocks || []} />
          <FinInfluencers />
          <ActivePolls polls={stats.polls || []} />
          <LatestNews />
          <RecentActivity />
        </div>

        <ReviewScroller />
      </div>

      <PageFooter />
    </div>
  );
}