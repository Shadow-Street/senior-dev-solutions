import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Target, TrendingUp, TrendingDown, Eye, Crown } from 'lucide-react';
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

  const recData = recommendations.length > 0 ? recommendations : sampleRecommendations;

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
    <Card className="shadow-lg border border-border bg-card">
      <CardHeader className="border-b border-divider bg-premium-muted">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-protocall-blue" />
            Advisor Picks
            <Crown className="w-4 h-4 text-protocall-premium-text" />
          </CardTitle>
          <Badge className="bg-premium text-premium-foreground text-xs">
            Premium
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 relative">
        <div className="locked-poll-card">
          <div className="space-y-4">
            {recData.slice(0, 3).map((rec) => (
              <div key={rec.id} className="p-4 rounded-lg border-2 border-protocall-premium-light bg-gradient-to-br from-premium-muted to-card">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                    <h4 className="font-semibold text-sm text-foreground">{rec.title}</h4>
                  </div>
                </div>
                
                {rec.target_price && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-subtle">Target:</span>
                    <span className="font-semibold text-positive">₹{rec.target_price}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs mt-2">
                  <Badge variant="outline" className={`text-xs ${
                    rec.risk_level === 'low' ? 'bg-buy-muted text-buy-muted-foreground' :
                    rec.risk_level === 'medium' ? 'bg-hold-muted text-hold-muted-foreground' :
                    'bg-sell-muted text-sell-muted-foreground'
                  }`}>
                    {rec.risk_level} risk
                  </Badge>
                  <span className="text-subtle capitalize">{rec.time_horizon?.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-protocall-deep to-protocall-blue text-white rounded-full p-3 mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Advisor Picks</h3>
            <p className="text-sm text-subtle mb-4">Access exclusive recommendations from verified advisors</p>
            <Link to={createPageUrl("Subscription")}>
              <Button size="sm" className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white hover:from-protocall-grape hover:to-protocall-deep">
                <Crown className="w-4 h-4 mr-2" />
                Unlock Premium
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}