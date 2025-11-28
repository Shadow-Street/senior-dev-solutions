import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Calendar, CheckCircle, ArrowUp, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
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
        const currentPlan = allPlans.find(p => 
          p.name.toLowerCase() === subscription.plan_type.toLowerCase() ||
          p.name.toLowerCase().replace(/\s+/g, '_') === subscription.plan_type.toLowerCase()
        );

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
      <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300">
        <CardHeader>
          <CardTitle className="text-slate-700">No Active Subscription</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-slate-600">You are currently on the free plan.</p>
          <Link to={createPageUrl("Subscription")}>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const getPlanGradient = (planType) => {
    switch(planType) {
      case 'vip': return 'from-yellow-400 via-orange-500 to-red-500';
      case 'premium': return 'from-purple-500 via-blue-600 to-indigo-600';
      default: return 'from-blue-400 to-cyan-500';
    }
  };

  const getPlanIcon = (planType) => {
    switch(planType) {
      case 'vip': return '👑';
      case 'premium': return '💎';
      default: return '🚀';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className={`bg-gradient-to-r ${getPlanGradient(subscription.plan_type)} text-white border-0 shadow-lg`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getPlanIcon(subscription.plan_type)}</span>
              <span>Your Current Plan</span>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {subscription.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold capitalize">{subscription.plan_type}</h3>
              <p className="opacity-90">
                ₹{subscription.price.toLocaleString()}{subscription.price > 0 ? '/month' : ' Forever'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-white/90">
                <Calendar className="w-4 h-4" />
                <div>
                  <p className="text-sm">Expires</p>
                  <p className="font-semibold">
                    {format(new Date(subscription.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoadingFeatures ? (
            <div className="text-center py-8 text-slate-500">
              Loading features...
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show Inheritance Summary First (if applicable) */}
              {parentPlanName && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-blue-900 font-semibold leading-relaxed">
                    Includes All {parentPlanName} Features
                  </span>
                </div>
              )}

              {/* Show Features for This Plan */}
              {planFeatures.length > 0 ? (
                <div className="grid gap-2">
                  {planFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm flex items-center flex-wrap">
                        {formatFeatureName(feature)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : parentPlanName ? (
                <div className="text-sm text-gray-500 italic text-center py-2">
                  No additional unique features
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No features specified for this plan
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Option */}
      {subscription.plan_type !== 'vip' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-lg mb-2">Want More Features?</h3>
            <p className="text-slate-600 mb-4">Upgrade to unlock advanced trading tools and exclusive content</p>
            <Link to={createPageUrl("Subscription")}>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
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