import React, { useState, useEffect } from 'react';
import { AdvisorRecommendation, PlatformSetting } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Target, TrendingUp, Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TomorrowsPick() {
  const [pick, setPick] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOverride, setIsOverride] = useState(false);
  const { checkAccess } = useSubscription();
  const hasAccess = checkAccess('Market Insider Insights');

  useEffect(() => {
    let isMounted = true;

    const fetchTomorrowsPick = async () => {
      try {
        // Check for manual override first
        const overrideSettings = await PlatformSetting.filter({
          key: 'tomorrows_pick_override'
        });

        if (overrideSettings.length > 0) {
          const overrideData = JSON.parse(overrideSettings[0].value);
          if (overrideData.active) {
            if (isMounted) {
              setPick({
                title: overrideData.title,
                stock_symbol: overrideData.stock_symbol,
                reasoning: overrideData.reasoning,
                target_price: overrideData.target_price,
                recommendation_type: overrideData.recommendation_type || 'buy',
                isOverride: true,
                confidence: overrideData.confidence || 'High'
              });
              setIsOverride(true);
            }
            return;
          }
        }

        // Auto-select logic - get most recent advisor recommendation
        const recommendations = await AdvisorRecommendation.list('-created_date', 1);
        if (recommendations.length > 0 && isMounted) {
          const latestRec = recommendations[0];
          setPick({
            title: `Tomorrow's Pick: ${latestRec.stock_symbol}`,
            stock_symbol: latestRec.stock_symbol,
            reasoning: latestRec.content.substring(0, 150) + '...',
            target_price: latestRec.target_price,
            recommendation_type: latestRec.recommendation_type,
            isOverride: false,
            confidence: latestRec.risk_level === 'low' ? 'High' : latestRec.risk_level === 'medium' ? 'Medium' : 'Low'
          });
        }
      } catch (error) {
        console.error("Error fetching tomorrow's pick:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTomorrowsPick();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white animate-pulse">
        <CardHeader className="border-b">
          <div className="h-4 bg-border rounded w-3/4"></div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-16 bg-border rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!pick) {
    return null;
  }

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'buy': return 'bg-buy-muted text-buy-muted-foreground border-buy/30';
      case 'sell': return 'bg-sell-muted text-sell-muted-foreground border-sell/30';
      default: return 'bg-hold-muted text-hold-muted-foreground border-hold/30';
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'High': return 'bg-buy-muted text-buy-muted-foreground';
      case 'Medium': return 'bg-hold-muted text-hold-muted-foreground';
      default: return 'bg-sell-muted text-sell-muted-foreground';
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white relative overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-surface-2 to-hold-muted">
        <CardTitle className="flex items-center gap-2 text-foreground text-sm">
          <Target className="w-4 h-4 text-hold-muted-foreground" />
          Tomorrow's Pick
          {isOverride && <Sparkles className="w-3 h-3 text-protocall-premium-text" />}
          <Crown className="w-3 h-3 text-hold-muted-foreground" />
        </CardTitle>
      </CardHeader>

      <CardContent className={`p-4 ${!hasAccess ? 'locked-poll-card' : ''}`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-foreground mb-1">{pick.stock_symbol}</h4>
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="outline" className={`text-xs ${getRecommendationColor(pick.recommendation_type)}`}>
                  <TrendingUp className="w-2 h-2 mr-1" />
                  {pick.recommendation_type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getConfidenceColor(pick.confidence)}`}>
                  {pick.confidence} Confidence
                </Badge>
                {isOverride && (
                  <Badge className="bg-premium-muted text-protocall-premium-text text-xs">
                    Analyst Selected
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {hasAccess ? (
            <div className="space-y-2">
              <p className="text-xs text-subtle leading-relaxed">
                {pick.reasoning}
              </p>
              {pick.target_price && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Target Price:</span>
                  <span className="font-semibold text-buy-muted-foreground">₹{pick.target_price}</span>
                </div>
              )}
              <p className="text-xs text-hold-muted-foreground font-medium">
                🎯 Updated daily at midnight
              </p>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-subtle mb-2">Premium insight available</p>
              <Link to={createPageUrl("Subscription")}>
                <Button size="sm" className="bg-hold hover:from-hold hover:to-hold text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Unlock Analysis
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>

      {/* Premium Overlay */}
      {!hasAccess && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center p-3">
            <div className="inline-flex items-center justify-center bg-hold text-hold-foreground rounded-full p-2 mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-foreground text-sm mb-1">Tomorrow's Pick</h4>
            <p className="text-xs text-subtle">Upgrade for full analysis</p>
          </div>
        </div>
      )}
    </Card>
  );
}