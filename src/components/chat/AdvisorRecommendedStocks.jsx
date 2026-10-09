import React, { useState, useEffect } from 'react';
import { Advisor, AdvisorRecommendation } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Shield, TrendingUp, TrendingDown, Lock, ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdvisorRecommendedStocks() {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { checkAccess } = useSubscription();
  const hasAccess = checkAccess({ type: 'premium' });

  useEffect(() => {
    let isMounted = true;

    const fetchAdvisorRecommendations = async () => {
      try {
        // Get recent advisor recommendations
        const recs = await AdvisorRecommendation.list('-created_date', 3);
        
        // Get advisor details for each recommendation
        const recsWithAdvisors = await Promise.all(
          recs.map(async (rec) => {
            try {
              const advisor = await Advisor.get(rec.created_by);
              return {
                ...rec,
                advisor_name: advisor?.display_name || 'Expert Advisor',
                advisor_image: advisor?.profile_image_url,
              };
            } catch (error) {
              return {
                ...rec,
                advisor_name: 'Expert Advisor',
                advisor_image: null,
              };
            }
          })
        );

        if (isMounted) {
          setRecommendations(recsWithAdvisors);
        }
      } catch (error) {
        console.error("Error fetching advisor recommendations:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAdvisorRecommendations();

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
          <div className="space-y-3">
            <div className="h-12 bg-border rounded"></div>
            <div className="h-12 bg-border rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'buy': return <TrendingUp className="w-3 h-3 text-buy-muted-foreground" />;
      case 'sell': return <TrendingDown className="w-3 h-3 text-sell-muted-foreground" />;
      default: return <Shield className="w-3 h-3 text-primary" />;
    }
  };

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'buy': return 'bg-buy-muted text-buy-muted-foreground border-buy/30';
      case 'sell': return 'bg-sell-muted text-sell-muted-foreground border-sell/30';
      default: return 'bg-premium-muted text-primary border-protocall-premium-light';
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white relative overflow-hidden">
      <CardHeader className="border-b bg-surface-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground text-sm">
            <Shield className="w-4 h-4 text-protocall-premium-text" />
            Advisor Picks
            <Crown className="w-3 h-3 text-protocall-premium-text" />
          </CardTitle>
          <Link to={createPageUrl("Advisors")}>
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className={`p-4 ${!hasAccess ? 'locked-poll-card' : ''}`}>
        <div className="space-y-3">
          {recommendations.slice(0, 2).map((rec) => (
            <div key={rec.id} className="p-3 rounded-lg border bg-gradient-to-r from-white to-surface-2 hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-protocall-grape flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                  {rec.advisor_image ? (
                    <img src={rec.advisor_image} alt={rec.advisor_name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    rec.advisor_name?.charAt(0)?.toUpperCase() || 'A'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {rec.stock_symbol}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getRecommendationColor(rec.recommendation_type)}`}>
                      {getRecommendationIcon(rec.recommendation_type)}
                      <span className="ml-1 capitalize">{rec.recommendation_type}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-subtle mb-1">{rec.advisor_name}</p>
                  
                  {hasAccess ? (
                    <div className="space-y-1">
                      <p className="text-xs text-subtle line-clamp-2">{rec.content?.substring(0, 80)}...</p>
                      {rec.target_price && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-semibold text-buy-muted-foreground">₹{rec.target_price}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Premium analysis available</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Premium Overlay */}
      {!hasAccess && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center p-3">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-primary to-protocall-grape text-white rounded-full p-2 mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-foreground text-sm mb-1">Advisor Picks</h4>
            <p className="text-xs text-subtle">Upgrade for full analysis</p>
          </div>
        </div>
      )}
    </Card>
  );
}