
import React, { useState } from "react";
import SampleStockCard from "../components/stocks/SampleStockCard";
import { IndianRupee, TrendingUp, TrendingDown } from "lucide-react";

// Dummy Card components for compilation.
// In a real project, these would typically be imported from a UI library
// (e.g., from '@/components/ui/card' if using Shadcn UI).
const Card = ({ className, children }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardContent = ({ className, children }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export default function SamplePortfolio() {
  // Sample static data for portfolio statistics
  const [portfolioStats] = useState({
    totalInvested: 150000,
    currentValue: 175000,
    totalPL: 25000,
    plPercentage: 16.67,
    dailyChange: 4500, // Added for the fourth card example
    dailyChangePercentage: 2.5, // Added for the fourth card example
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-2 via-buy to-surface-2 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-buy to-protocall-blue bg-clip-text text-transparent">
            Enhanced Stock Portfolio Sample
          </h1>
          <p className="text-xl text-subtle max-w-3xl mx-auto">
            Showcasing all the advanced features: Investment Tracking, Premium Advice, Multi-Channel Alerts & More
          </p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:// ... keep existing code (imports and component logic) ...:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-protocall-deep to-protocall-blue text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Total Invested</p>
                  <p className="text-3xl font-bold mt-2">₹{portfolioStats.totalInvested.toLocaleString()}</p>
                </div>
                <IndianRupee className="w-10 h-10 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-protocall-deep to-protocall-blue text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Current Value</p>
                  <p className="text-3xl font-bold mt-2">₹{portfolioStats.currentValue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-white/80" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${portfolioStats.totalPL >= 0 ? 'from-buy to-buy-soft' : 'from-sell to-sell'} text-white border-0 shadow-lg`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm font-medium">Total P/L</p>
                  <p className="text-3xl font-bold mt-2">₹{portfolioStats.totalPL.toLocaleString()}</p>
                  <p className="text-white/90 text-xs mt-1">{portfolioStats.plPercentage.toFixed(2)}%</p>
                </div>
                {portfolioStats.totalPL >= 0 ? <TrendingUp className="w-10 h-10 text-white/80" /> : <TrendingDown className="w-10 h-10 text-white/80" />}
              </div>
            </CardContent>
          </Card>

          {/* Additional card for Daily Change, following the pattern */}
          <Card className={`bg-gradient-to-br ${portfolioStats.dailyChange >= 0 ? 'from-hold to-hold' : 'from-sell to-sell'} text-white border-0 shadow-lg`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm font-medium">Daily Change</p>
                  <p className="text-3xl font-bold mt-2">₹{portfolioStats.dailyChange.toLocaleString()}</p>
                  <p className="text-white/90 text-xs mt-1">{portfolioStats.dailyChangePercentage.toFixed(2)}%</p>
                </div>
                {portfolioStats.dailyChange >= 0 ? <TrendingUp className="w-10 h-10 text-white/80" /> : <TrendingDown className="w-10 h-10 text-white/80" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sample Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-buy-muted rounded-full flex items-center justify-center">
                <span className="text-buy-muted-foreground font-bold text-sm">P&L</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Investment Tracking</p>
                <p className="text-xs text-muted-foreground">Real-time profit/loss calculation</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center">
                <span className="text-protocall-premium-text font-bold text-sm">AI</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Premium Advice</p>
                <p className="text-xs text-muted-foreground">Community + SEBI advisor consensus</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center">
                <span className="text-primary font-bold text-sm">🔔</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Smart Alerts</p>
                <p className="text-xs text-muted-foreground">Multi-channel notifications</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-hold-muted rounded-full flex items-center justify-center">
                <span className="text-hold-muted-foreground font-bold text-sm">📊</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Live Data</p>
                <p className="text-xs text-muted-foreground">Real-time market insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Stock Card */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <SampleStockCard />
          </div>
        </div>

        {/* Feature Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-bold text-lg mb-4 text-buy-muted-foreground">💰 Investment Features</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-buy rounded-full"></div>
                Real-time profit/loss calculation
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-buy rounded-full"></div>
                Portfolio value tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-buy rounded-full"></div>
                Performance percentage display
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-buy rounded-full"></div>
                Investment history & analytics
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-bold text-lg mb-4 text-protocall-premium-text">👥 Premium Advice</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Community poll consensus
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                SEBI advisor recommendations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Confidence scoring system
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Premium subscription benefits
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-bold text-lg mb-4 text-primary">🔔 Smart Alerts</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Price change notifications
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Profit/loss target alerts
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Community consensus changes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Multi-channel delivery (app, email, push)
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="font-bold text-lg mb-4 text-hold-muted-foreground">📊 Live Features</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hold rounded-full"></div>
                Real-time stock prices
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hold rounded-full"></div>
                Market sentiment tracking
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hold rounded-full"></div>
                Volume & volatility data
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-hold rounded-full"></div>
                Interactive navigation
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
