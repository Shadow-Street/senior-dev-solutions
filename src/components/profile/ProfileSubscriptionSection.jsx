import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle, ArrowUp, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SubscriptionPlan } from '@/api/entities';

// ✅ FIX: Feature name mapping for proper display
const featureNameMap = {
  'whatsapp_support_group': 'WhatsApp Support Group',
  'premium_research_reports': 'Premium Research Reports',
  'custom_alerts_notifications': 'Custom Alerts & Notifications',
  'one_on_one_trading_sessions': 'One-on-One Trading Sessions',
  'market_insider_insights': 'Market Insider Insights',
  'risk_management_tools': 'Risk Management Tools',
  'premium_chat_rooms': 'Premium Chat Rooms',
  'premium_events': 'Premium Events',
  'premium_polls': 'Premium Polls',
  'admin_recommendations': 'Admin Recommendations',
  'advisor_subscriptions': 'Advisor Subscriptions',
  'exclusive_finfluencer_content': 'Exclusive Finfluencer Content',
  'chat_rooms': 'Chat Rooms',
  'community_polls': 'Community Polls',
  'pledge_pool': 'Pledge Pool Access',
  'advisor_picks': 'Advisor Picks',
  'priority_support': 'Priority Support',
  'exclusive_events': 'Exclusive Events'
};

// ✅ Helper function to format feature names
const formatFeatureName = (feature) => {
  if (typeof feature !== 'string') return 'Feature';
  
  // Check if it's in the map
  if (featureNameMap[feature]) {
    return featureNameMap[feature];
  }
  
  // If already formatted (contains spaces), return as is
  if (feature.includes(' ')) {
    return feature;
  }
  
  // Convert snake_case to Title Case
  return feature
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function ProfileSubscriptionSection({ subscription }) {
  const [planFeatures, setPlanFeatures] = useState([]);
  const [parentPlanName, setParentPlanName] = useState(null);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  useEffect(() => {
    const loadPlanFeatures = async () => {
      if (!subscription) {
        setIsLoadingFeatures(false);
        return;
      }

      try {
        setIsLoadingFeatures(true);
        
        // Fetch all subscription plans
        const allPlans = await SubscriptionPlan.list();
        
        // Find the current plan by matching plan_type with plan name
        const planKey = String(subscription.plan_type || '').toLowerCase();
        const currentPlan = (Array.isArray(allPlans) ? allPlans : []).find(p => {
          const planName = String(p.name || '').toLowerCase();
          return planName === planKey || planName.replace(/\s+/g, '_') === planKey;
        });

        if (!currentPlan) {
          setPlanFeatures([]);
          setIsLoadingFeatures(false);
          return;
        }

        // Get parent plan name if exists
        if (currentPlan.inherits_from_plan_id) {
          const parentPlan = allPlans.find(p => p.id === currentPlan.inherits_from_plan_id);
          if (parentPlan) {
            setParentPlanName(parentPlan.name);
          }
        }

        // Get visible features for this plan
        const visibleFeatures = currentPlan.features || [];

        setPlanFeatures(visibleFeatures);
        
      } catch (error) {
        console.error('Error loading plan features:', error);
        setPlanFeatures([]);
      } finally {
        setIsLoadingFeatures(false);
      }
    };

    loadPlanFeatures();
  }, [subscription]);

  if (!subscription) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-subtle">No Active Subscription</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-subtle">You are currently on the free plan.</p>
          <Link to={createPageUrl("Subscription")}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Features */}
      <Card>
        <CardHeader className="bg-card border-b border-divider">
          <CardTitle>What your plan includes</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoadingFeatures ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading features...
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show Inheritance Summary First (if applicable) */}
              {parentPlanName && (
                <div className="flex items-start gap-3 p-3 bg-premium-muted rounded-lg border border-protocall-premium-light mb-4">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-0.5">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-primary font-semibold leading-relaxed">
                    Includes All {parentPlanName} Features
                  </span>
                </div>
              )}

              {/* Show Features for This Plan */}
              {planFeatures.length > 0 ? (
                <div className="grid gap-2">
                  {planFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-positive flex-shrink-0" />
                      <span className="text-sm flex items-center flex-wrap">
                        {formatFeatureName(feature)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : parentPlanName ? (
                <div className="text-sm text-muted-foreground italic text-center py-2">
                  No additional unique features
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No features specified for this plan
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Option */}
      {String(subscription.plan_type || '').toLowerCase() !== 'vip' && (
        <Card className="bg-card border-protocall-premium-light">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-lg mb-2">Want More Features?</h3>
            <p className="text-subtle mb-4">Upgrade to unlock advanced trading tools and exclusive content</p>
            <Link to={createPageUrl("Subscription")}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ArrowUp className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}