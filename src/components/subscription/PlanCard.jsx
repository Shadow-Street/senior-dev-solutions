import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Crown, Zap, Shield, UserCircle, Tag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PromoCode, SubscriptionTransaction } from "@/api/entities";

// ✅ Feature name mapping
const featureNameMap = {
  'premium_chat_rooms': 'Premium Chat Rooms',
  'premium_polls': 'Premium Polls',
  'premium_events': 'Premium Events',
  'advisor_subscriptions': 'Advisor Subscriptions',
  'exclusive_finfluencer_content': 'Exclusive Finfluencer Content',
  'admin_recommendations': 'Admin Recommendations',
  'chat_rooms': 'Chat Rooms',
  'community_polls': 'Community Polls',
  'pledge_pool': 'Pledge Pool Access',
  'advisor_picks': 'Advisor Picks',
  'priority_support': 'Priority Support',
  'exclusive_events': 'Exclusive Events',
  'Chat Rooms': 'Chat Rooms',
  'Community Polls': 'Community Polls',
  'Advisor Picks': 'Advisor Picks',
  'Premium Polls': 'Premium Polls',
  'Pledge Pool Access': 'Pledge Pool Access',
  'Priority Support': 'Priority Support',
  'Exclusive Events': 'Exclusive Events'
};

const getFeatureName = (feature) => {
  if (typeof feature !== 'string') return 'Feature';
  
  if (featureNameMap[feature]) {
    return featureNameMap[feature];
  }
  
  return feature
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ✅ Plan tier hierarchy
const planTierHierarchy = {
  'basic': { order: 1, name: 'Free' },
  'free': { order: 1, name: 'Free' },
  'premium': { order: 2, name: 'Premium', parent: 'Free' },
  'vip': { order: 3, name: 'VIP', parent: 'Premium' },
  'elite': { order: 3, name: 'Elite', parent: 'Premium' }
};

// ✅ Plan-specific light background colors
const getPlanBackgroundColor = (planName) => {
  const normalized = planName.toLowerCase().trim();
  
  if (normalized === 'basic' || normalized === 'free') {
    return 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100';
  }
  if (normalized === 'premium') {
    return 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100';
  }
  if (normalized === 'vip' || normalized === 'elite') {
    return 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100';
  }
  
  return 'bg-white'; // Default fallback
};

export default function PlanCard({ plan, isCurrentPlan, currentPlanTier, onSelect, user, allPlans = [] }) {
  const [selectedCycle, setSelectedCycle] = React.useState('monthly');
  const [promoCode, setPromoCode] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = React.useState(false);

  const getPlanIcon = () => {
    const planName = plan.name.toLowerCase();
    if (planName.includes('vip') || planName.includes('elite')) {
      return <Crown className="w-5 h-5" />;
    }
    if (planName.includes('premium')) {
      return <Sparkles className="w-5 h-5" />;
    }
    return <UserCircle className="w-5 h-5" />;
  };

  const getPlanColor = () => {
    const planName = plan.name.toLowerCase();
    if (planName.includes('vip') || planName.includes('elite')) {
      return 'text-yellow-600';
    }
    if (planName.includes('premium')) {
      return 'text-purple-600';
    }
    return 'text-blue-600';
  };

  const monthlyPrice = plan.price_monthly || 0;
  const annualPrice = plan.price_annually || 0;

  // Calculate final amount with promo
  const calculateFinalAmount = (cycle) => {
    const baseAmount = cycle === 'monthly' ? monthlyPrice : annualPrice;
    
    if (!appliedPromo) return baseAmount;

    if (appliedPromo.discount_type === 'percentage') {
      return baseAmount - (baseAmount * appliedPromo.discount_value / 100);
    } else {
      return Math.max(0, baseAmount - appliedPromo.discount_value);
    }
  };
  
  const monthlyFinalPrice = calculateFinalAmount('monthly');
  const annualFinalPrice = calculateFinalAmount('annual');
  
  const hasMonthlyDiscount = appliedPromo && monthlyFinalPrice < monthlyPrice;
  const hasAnnualDiscount = appliedPromo && annualFinalPrice < annualPrice;

  // Calculate annual savings percentage
  const monthlySavings = monthlyPrice > 0 && annualPrice > 0 
    ? Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100) 
    : 0;

  const isFree = monthlyPrice === 0 && annualPrice === 0;

  const currentTierInfo = planTierHierarchy[currentPlanTier?.toLowerCase()?.trim()] || { order: 0 };
  const thisTierInfo = planTierHierarchy[plan.name.toLowerCase().trim()] || { order: 0 };
  
  const isIncluded = currentTierInfo.order > thisTierInfo.order;
  const isUpgrade = currentTierInfo.order > 0 && currentTierInfo.order < thisTierInfo.order;

  const getParentPlanName = () => {
    if (thisTierInfo.parent) {
      return thisTierInfo.parent;
    }
    return null;
  };

  const parentPlanName = getParentPlanName();

  const getButtonState = () => {
    if (isCurrentPlan) return 'current';
    if (isIncluded) return 'included';
    if (isUpgrade) return 'upgrade';
    return 'subscribe';
  };

  const buttonState = getButtonState();
  const cardBackground = getPlanBackgroundColor(plan.name);

  // Promo code handling
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    if (!user) {
      toast.error('Please log in to use promo codes');
      return;
    }

    setIsValidatingPromo(true);

    try {
      const promoCodes = await PromoCode.filter({ code: promoCode.trim(), is_active: true });
      
      if (promoCodes.length === 0) {
        toast.error('Invalid or expired promo code');
        setAppliedPromo(null);
        return;
      }

      const promo = promoCodes[0];

      if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
        toast.error('This promo code has expired');
        setAppliedPromo(null);
        return;
      }

      if (promo.usage_limit && promo.current_usage >= promo.usage_limit) {
        toast.error('This promo code has reached its usage limit');
        setAppliedPromo(null);
        return;
      }

      const userTransactions = await SubscriptionTransaction.filter({ 
        user_id: user.id, 
        promo_code: promo.code 
      });
      
      if (userTransactions && userTransactions.length > 0) {
        toast.error('You have already used this promo code');
        setAppliedPromo(null);
        return;
      }

      setAppliedPromo(promo);
      toast.success(`Promo applied! ${promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `₹${promo.discount_value} off`}`);
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast.error('Failed to apply promo code');
      setAppliedPromo(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleSelectPlan = () => {
    // Pass promo data along with plan selection
    const discountAmount = appliedPromo ? 
      (selectedCycle === 'monthly' ? monthlyPrice : annualPrice) - 
      (selectedCycle === 'monthly' ? monthlyFinalPrice : annualFinalPrice) : 0;

    onSelect(plan, selectedCycle, appliedPromo, discountAmount);
  };

  return (
    <Card className={`relative overflow-hidden border-2 border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 ${cardBackground}`}>
      <CardContent className="p-6">
        {/* Plan Name and Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={getPlanColor()}>
              {getPlanIcon()}
            </span>
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">System</Badge>
            {isCurrentPlan && (
              <Badge className="bg-gray-900 text-white text-xs">Active</Badge>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          {isFree ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">₹0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Basic platform access</p>
            </>
          ) : (
            <>
              {/* Monthly Price */}
              <div className="flex items-baseline gap-2">
                {hasMonthlyDiscount && (
                  <span className="text-2xl font-semibold text-gray-400 line-through">
                    ₹{monthlyPrice}
                  </span>
                )}
                <span className="text-4xl font-bold text-gray-900">
                  ₹{Math.round(monthlyFinalPrice)}
                </span>
                <span className="text-gray-500">/month</span>
              </div>

              {/* Annual Price Option */}
              {annualPrice > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-600">
                    or ₹{Math.round(hasAnnualDiscount ? annualFinalPrice : annualPrice)}/year
                  </p>
                  {monthlySavings > 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs border-0">
                      Save {monthlySavings}%
                    </Badge>
                  )}
                </div>
              )}

              {/* Promo Discount Badge */}
              {(hasMonthlyDiscount || hasAnnualDiscount) && (
                <Badge className="mt-2 bg-green-100 text-green-700 border-green-300">
                  Promo Applied: Save ₹{Math.round(monthlyPrice - monthlyFinalPrice)}/mo
                </Badge>
              )}

              <p className="text-sm text-gray-500 mt-2">
                {plan.description || 'Access to premium features'}
              </p>
            </>
          )}
        </div>

        {/* Promo Code Section - Only for paid plans */}
        {!isFree && (
          <div className="mb-4 p-3 bg-white/60 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">Have a Promo Code?</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={isValidatingPromo || !!appliedPromo || !user}
                className="text-sm h-8"
              />
              {appliedPromo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoCode('');
                    toast.info('Promo removed');
                  }}
                  className="h-8"
                >
                  <X className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleApplyPromo}
                  disabled={isValidatingPromo || !promoCode.trim() || !user}
                  className="h-8 px-3"
                >
                  {isValidatingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                </Button>
              )}
            </div>
            {!user && (
              <p className="text-xs text-amber-600 mt-1">Login to use promo codes</p>
            )}
          </div>
        )}

        {/* Features Section */}
        <div className="mb-6">
          {/* Parent Plan Inclusion */}
          {parentPlanName && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-3 border border-blue-100">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-900">
                Includes All {parentPlanName} Features
              </span>
            </div>
          )}

          {/* Additional Features Header */}
          {plan.features && plan.features.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {parentPlanName ? `Additional ${plan.name} Features:` : 'Features:'}
              </h4>
            </div>
          )}

          {/* Features List */}
          {plan.features && plan.features.length > 0 ? (
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    {getFeatureName(feature)}
                  </span>
                </div>
              ))}
            </div>
          ) : parentPlanName ? (
            <p className="text-sm text-gray-500 italic">No additional unique features</p>
          ) : null}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleSelectPlan}
          disabled={isCurrentPlan || isIncluded}
          variant="outline"
          className={`w-full ${
            buttonState === 'current'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 cursor-not-allowed hover:from-green-500 hover:to-emerald-500'
              : buttonState === 'included'
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 cursor-not-allowed hover:from-gray-400 hover:to-gray-500'
              : buttonState === 'upgrade'
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600 shadow-lg'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 shadow-lg'
          }`}
        >
          {buttonState === 'current' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Current Plan
            </>
          ) : buttonState === 'included' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Included
            </>
          ) : buttonState === 'upgrade' ? (
            'Upgrade Plan'
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}