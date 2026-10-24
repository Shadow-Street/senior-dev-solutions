import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Target, TrendingUp, TrendingDown, Eye, Crown, Lock, Sparkles } from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdvisorRecommendations({ recommendations }) {
  // Fallback sample data - NO DATABASE CALLS
  const sampleRecommendations = [
    {
      id: '1',
      title: 'RELIANCE - Strong Buy Recommendation',
      stock_symbol: 'RELIANCE',
      recommendation_type: 'buy',
      target_price: 2800,
      risk_level: 'medium',
      time_horizon: 'medium_term'
    },
    {
      id: '2',
      title: 'Banking Sector - Selective Approach',
      stock_symbol: 'HDFCBANK',
      recommendation_type: 'buy',
      target_price: 1850,
      risk_level: 'low',
      time_horizon: 'long_term'
    },
    {
      id: '3',
      title: 'IT Stocks - Wait and Watch',
      stock_symbol: 'TCS',
      recommendation_type: 'hold',
      target_price: 3600,
      risk_level: 'medium',
      time_horizon: 'short_term'
    }
  ];

  const recData = recommendations?.length > 0 ? recommendations : sampleRecommendations;

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'buy': return <TrendingUp className="w-3 h-3" />;
      case 'sell': return <TrendingDown className="w-3 h-3" />;
      case 'watch': return <Eye className="w-3 h-3" />;
      default: return <Target className="w-3 h-3" />;
    }
  };

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'buy': return 'bg-buy text-buy-foreground border-transparent';
      case 'sell': return 'bg-sell-muted text-sell-muted-foreground border-sell/30';
      case 'watch': return 'bg-premium-muted text-premium-muted-foreground border-premium/30';
      default: return 'bg-hold-muted text-hold-muted-foreground border-hold/30';
    }
  };

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-divider bg-gradient-to-r from-buy-muted/70 to-card px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-5 w-5 text-positive" />
          Advisor Picks
          <Crown className="h-4 w-4 text-premium" />
        </h2>
        <Badge className="border-transparent bg-premium-muted text-xs font-semibold text-premium-muted-foreground hover:bg-premium-muted">
          Premium Only
        </Badge>
      </div>

      <CardContent className="relative min-h-[380px] p-4 sm:p-5">
        {/* Preview of the locked content. It is blurred and hidden from
            assistive tech: the overlay below is the only real content here. */}
        <div aria-hidden="true" className="pointer-events-none select-none space-y-3 blur-[3px]">
          {recData.slice(0, 3).map((rec) => (
            <div key={rec.id} className="rounded-lg border border-divider bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold">
                  {rec.stock_symbol}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${getRecommendationColor(rec.recommendation_type)}`}
                >
                  {getRecommendationIcon(rec.recommendation_type)}
                  <span className="ml-1 capitalize">{rec.recommendation_type}</span>
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
              {rec.target_price && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-subtle">Target:</span>
                  <span className="font-semibold text-positive">₹{rec.target_price}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-xs">
                <Badge variant="outline" className={`text-xs ${
                  rec.risk_level === 'low' ? 'bg-buy-muted text-buy-muted-foreground' :
                  rec.risk_level === 'medium' ? 'bg-hold-muted text-hold-muted-foreground' :
                  'bg-sell-muted text-sell-muted-foreground'
                }`}>
                  {rec.risk_level} risk
                </Badge>
                <span className="capitalize text-subtle">{rec.time_horizon?.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-card/75 p-6 backdrop-blur-[2px]">
          <div className="max-w-[18rem] text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-buy text-buy-foreground shadow-lg shadow-buy/40">
              <Shield className="h-8 w-8" strokeWidth={2.25} />
            </span>
            <h3 className="mb-2 flex items-center justify-center gap-1.5 text-lg font-bold text-foreground">
              <Lock className="h-4 w-4 text-hold" />
              Premium Feature
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-subtle">
              Get expert stock picks from SEBI-registered advisors with detailed analysis and price targets
            </p>
            <Link
              to={createPageUrl("Subscription")}
              className="inline-flex items-center gap-2 rounded-lg bg-buy px-4 py-2.5 text-sm font-semibold text-buy-foreground shadow-md shadow-buy/40 transition-colors
                         hover:bg-buy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Crown className="h-4 w-4" />
              Unlock Premium Access
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-hold" />
              Includes all premium features
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
