import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Crown, Zap, Shield, UserCircle, Tag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PromoCode, SubscriptionTransaction } from "@/lib/apiClient";

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
    return 'bg-surface-2';
  }
  if (normalized === 'premium') {
    return 'bg-surface-2';
  }
  if (normalized === 'vip' || normalized === 'elite') {
    return 'bg-gradient-to-br from-surface-2 via-hold to-hold-muted';
  }

  return 'bg-white'; // Default fallback
};

export default function PlanCard({ plan, isCurrentPlan, currentPlanTier, onSelect, user, allPlans = [], cycle = 'monthly' }) {
  // The billing cycle is owned by the Subscription page so every card agrees.
  const selectedCycle = cycle === 'annually' ? 'annually' : 'monthly';
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
      return 'text-hold-muted-foreground';
    }
    if (planName.includes('premium')) {
      return 'text-protocall-premium-text';
    }
    return 'text-primary';
  };

  const monthlyPrice = plan.price_monthly || 0;
  const annualPrice = plan.price_annually || 0;

  // Calculate final amount with promo
  const calculateFinalAmount = (forCycle) => {
    const baseAmount = forCycle === 'monthly' ? monthlyPrice : annualPrice;

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
  const isAnnual = selectedCycle === 'annually';

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
    <Card className={`relative overflow-hidden border-2 border-border shadow-md hover:shadow-xl transition-all duration-300 ${cardBackground}`}>
      <CardContent className="p-6">
        {/* Plan Name and Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={getPlanColor()}>
              {getPlanIcon()}
            </span>
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">System</Badge>
            {isCurrentPlan && (
              <Badge className="bg-protocall-ink text-white text-xs">Active</Badge>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          {isFree ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">₹0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Basic platform access</p>
            </>
          ) : (
            <>
              {/* Headline price for the selected billing cycle */}
              <div className="flex items-baseline gap-2">
                {isAnnual
                  ? hasAnnualDiscount && (
                      <span className="text-2xl font-semibold text-muted-foreground line-through">
                        ₹{annualPrice}
                      </span>
                    )
                  : hasMonthlyDiscount && (
                      <span className="text-2xl font-semibold text-muted-foreground line-through">
                        ₹{monthlyPrice}
                      </span>
                    )}
                <span className="text-4xl font-bold text-foreground">
                  ₹{Math.round(isAnnual ? annualFinalPrice : monthlyFinalPrice)}
                </span>
                <span className="text-muted-foreground">{isAnnual ? '/year' : '/month'}</span>
              </div>

              {/* The other cycle, shown as the alternative */}
              {isAnnual
                ? monthlyPrice > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-subtle">
                        or ₹{Math.round(hasMonthlyDiscount ? monthlyFinalPrice : monthlyPrice)}/month
                      </p>
                      {monthlySavings > 0 && (
                        <Badge className="bg-buy-muted text-buy-muted-foreground text-xs border-0">
                          Save {monthlySavings}% yearly
                        </Badge>
                      )}
                    </div>
                  )
                : annualPrice > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-subtle">
                        or ₹{Math.round(hasAnnualDiscount ? annualFinalPrice : annualPrice)}/year
                      </p>
                      {monthlySavings > 0 && (
                        <Badge className="bg-buy-muted text-buy-muted-foreground text-xs border-0">
                          Save {monthlySavings}%
                        </Badge>
                      )}
                    </div>
                  )}

              {/* Promo Discount Badge */}
              {(hasMonthlyDiscount || hasAnnualDiscount) && (
                <Badge className="mt-2 bg-buy-muted text-buy-muted-foreground border-buy/30">
                  Promo Applied: Save ₹{Math.round(isAnnual ? annualPrice - annualFinalPrice : monthlyPrice - monthlyFinalPrice)}{isAnnual ? '/yr' : '/mo'}
                </Badge>
              )}

              <p className="text-sm text-muted-foreground mt-2">
                {plan.description || 'Access to premium features'}
              </p>
            </>
          )}
        </div>

        {/* Promo Code Section - Only for paid plans */}
        {!isFree && (
          <div className="mb-4 p-3 bg-white/60 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-subtle" />
              <span className="text-xs font-semibold text-subtle">Have a Promo Code?</span>
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
              <p className="text-xs text-hold-muted-foreground mt-1">Login to use promo codes</p>
            )}
          </div>
        )}

        {/* Features Section */}
        <div className="mb-6">
          {/* Parent Plan Inclusion */}
          {parentPlanName && (
            <div className="flex items-center gap-2 p-3 bg-premium-muted rounded-lg mb-3 border border-protocall-premium-light">
              <Shield className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-primary">
                Includes All {parentPlanName} Features
              </span>
            </div>
          )}

          {/* Additional Features Header */}
          {plan.features && plan.features.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-foreground">
                {parentPlanName ? `Additional ${plan.name} Features:` : 'Features:'}
              </h4>
            </div>
          )}

          {/* Features List */}
          {plan.features && (
            <div className="space-y-2">
              {(() => {
                const safeParseFeatures = (features) => {
                  if (Array.isArray(features)) return features;
                  if (typeof features === 'string') {
                    try {
                      const parsed = JSON.parse(features);
                      return Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                      return [];
                    }
                  }
                  return [];
                };

                const featuresList = safeParseFeatures(plan.features);

                if (featuresList.length === 0) {
                  return parentPlanName ? (
                    <p className="text-sm text-muted-foreground italic">No additional unique features</p>
                  ) : null;
                }

                return featuresList.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-positive flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-subtle">
                      {getFeatureName(feature)}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleSelectPlan}
          disabled={isCurrentPlan || isIncluded}
          variant="outline"
          className={`w-full ${buttonState === 'current'
              ? 'bg-buy-soft text-buy-foreground border-0 cursor-not-allowed hover:from-buy hover:to-buy-soft'
              : buttonState === 'included'
                ? 'bg-gradient-to-r from-surface-2 to-protocall-sidebar-bg text-white border-0 cursor-not-allowed hover:from-surface-2 hover:to-protocall-sidebar-bg'
                : buttonState === 'upgrade'
                  ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white border-0 hover:from-protocall-deep hover:to-protocall-blue shadow-lg'
                  : 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white border-0 hover:from-protocall-deep hover:to-protocall-blue shadow-lg'
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