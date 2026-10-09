import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/context/AuthContext";
import { useSubscription } from "@/components/hooks/useSubscription";
import apiClient from "@/lib/apiClient";
import { createPageUrl } from "@/utils";
import SubscriptionCheckoutModal from "@/components/subscription/SubscriptionCheckoutModal";
import PlanCard from "@/components/subscription/PlanCard";
import CurrentSubscriptionCard from "@/components/subscription/CurrentSubscriptionCard";
import UserSubscriptionHistory from "@/components/subscription/UserSubscriptionHistory";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annually'
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await apiClient.get('/subscriptions/plans');
      // Sort plans: Free -> Premium -> VIP
      const sortedPlans = data.sort((a, b) => {
        const priceA = a.price_monthly !== undefined ? a.price_monthly : a.price;
        const priceB = b.price_monthly !== undefined ? b.price_monthly : b.price;
        return (Number(priceA) || 0) - (Number(priceB) || 0);
      });
      setPlans(sortedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setIsLoading(false);
    }
  };

  // Best genuine annual saving across plans, straight from the API prices.
  const maxAnnualSavings = plans.reduce((best, plan) => {
    const monthly = Number(plan.price_monthly ?? plan.price) || 0;
    const annual = Number(plan.price_annually) || 0;
    if (monthly <= 0 || annual <= 0) return best;
    const pct = Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100);
    return pct > best ? pct : best;
  }, 0);

  const handleSelectPlan = (plan, cycle = billingCycle) => {
    if (!user) {
      toast.error("Please log in to subscribe");
      return;
    }

    const price = cycle === 'annually'
      ? (plan.price_annually ?? (Number(plan.price_monthly ?? plan.price) || 0) * 12)
      : (plan.price_monthly ?? plan.price);

    if (Number(price) === 0) {
      toast.info("Free plan is included.");
      return;
    }

    setSelectedPlan(plan);
    setBillingCycle(cycle);
    setShowCheckoutModal(true);
  };

  const handleRenew = () => {
    if (subscription && plans.length > 0) {
      const planToRenew = plans.find(p => p.name.toLowerCase() === subscription.plan_type.toLowerCase());
      if (planToRenew) {
        handleSelectPlan(planToRenew);
        return;
      }
    }
    const fallbackPlan = plans.find(p => p.name.toLowerCase().includes('premium')) || plans[1];
    if (fallbackPlan) {
      handleSelectPlan(fallbackPlan);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will lose access to premium features at the end of the billing period.")) return;

    try {
      await apiClient.post('/subscriptions/cancel', { reason: 'User requested cancellation' });
      toast.success("Subscription cancelled successfully");
      refreshSubscription();
    } catch (error) {
      console.error("Cancellation error:", error);
      toast.error(error.response?.data?.error || "Failed to cancel subscription");
    }
  };

  const handleUpgrade = () => {
    const plansSection = document.querySelector('.plans-grid');
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlanTier = subscription?.status === 'active' ? subscription.plan_type : 'Free';
  const isCurrentActive = subscription?.status === 'active';

  return (
    <div className="w-full bg-background p-6">
      {/* Login Prompt for Non-Authenticated Users */}
      {!user && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-premium-muted flex items-center justify-center">
                <Crown className="w-5 h-5 text-protocall-premium-text" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-protocall-premium-text">Explore Our Plans</p>
                <p className="text-xs text-protocall-premium-text mt-1">Log in to subscribe and unlock premium features</p>
              </div>
              <Link to={createPageUrl("Profile")}>
                <Button size="sm" className="bg-primary hover:bg-primary">
                  Log In to Subscribe
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-protocall-deep to-protocall-blue text-white px-4 py-2 rounded-full">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Premium Features</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Choose Your Plan
          </h1>
          <p className="text-subtle max-w-2xl mx-auto">
            Unlock exclusive features, advisor picks, and premium content to enhance your trading journey
          </p>
        </div>

        {/* Current Subscription Status Card */}
        {subscription && (
          <>
            <CurrentSubscriptionCard
              subscription={subscription}
              onRenew={handleRenew}
              onCancel={handleCancelSubscription}
            />
          </>
        )}

        {/* Billing history sits outside the `subscription &&` block on purpose.
            Invoices are historical records, so they are needed precisely after
            a subscription lapses — for accounting, tax and disputes. Nesting
            them under "has a current subscription" hid every past invoice from
            anyone whose plan had ended. The component hides itself when there
            is nothing to show. */}
        <div className="mb-8">
          <UserSubscriptionHistory />
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-white p-1.5 rounded-full border border-border shadow-sm flex items-center gap-3">
            <span className={`text-sm px-3 py-1 font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={billingCycle === 'annually'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm px-3 py-1 font-semibold transition-colors flex items-center gap-1 ${billingCycle === 'annually' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
              {maxAnnualSavings > 0 && (
                <span className="text-protocall-green-text text-[10px] bg-buy-muted px-1.5 py-0.5 rounded-full border border-buy/30 uppercase tracking-tight font-bold">
                  Save {maxAnnualSavings}%
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto plans-grid">
          {plans.map((plan) => {
            const baseMonthlyPrice = Number(plan.price_monthly ?? plan.price) || 0;
            const baseAnnualPrice = plan.price_annually != null && plan.price_annually !== ''
              ? Number(plan.price_annually) || 0
              : baseMonthlyPrice * 12;

            const displayPlan = {
              ...plan,
              price_monthly: baseMonthlyPrice,
              price_annually: Math.round(baseAnnualPrice)
            };

            return (
              <PlanCard
                key={plan.id}
                plan={displayPlan}
                isCurrentPlan={isCurrentActive && plan.name.toLowerCase() === (subscription?.plan_type || '').toLowerCase()}
                currentPlanTier={currentPlanTier}
                onSelect={(p) => handleSelectPlan(p, billingCycle)}
                user={user}
                allPlans={plans}
                cycle={billingCycle}
              />
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader className="bg-background border-b">
            <CardTitle className="text-center text-2xl font-bold text-foreground">
              Frequently Asked Questions
            </CardTitle>
            <p className="text-center text-sm text-subtle mt-2">
              Click on any question to view the answer
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="item-1" className="border rounded-xl px-4 bg-white hover:bg-surface-2 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-premium-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">1</span>
                    </div>
                    <span className="font-semibold text-foreground">Can I cancel anytime?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-subtle text-sm leading-relaxed">
                    Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period, so you can enjoy all premium features until then. No hidden fees or penalties for cancellation.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-xl px-4 bg-white hover:bg-surface-2 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-premium-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-protocall-premium-text font-bold text-sm">2</span>
                    </div>
                    <span className="font-semibold text-foreground">What payment methods do you accept?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-subtle text-sm leading-relaxed">
                    We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payment gateway. All transactions are encrypted and PCI-DSS compliant for your security.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-xl px-4 bg-white hover:bg-surface-2 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-buy-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-buy-muted-foreground font-bold text-sm">3</span>
                    </div>
                    <span className="font-semibold text-foreground">Can I upgrade or downgrade my plan?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-subtle text-sm leading-relaxed">
                    Yes, you can change your plan at any time. When upgrading, you'll get immediate access to premium features. When downgrading, changes take effect at the end of your current billing cycle. Pro-rated credits are applied automatically.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-xl px-4 bg-white hover:bg-surface-2 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-hold-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-hold-muted-foreground font-bold text-sm">4</span>
                    </div>
                    <span className="font-semibold text-foreground">Do promo codes work on all plans?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-subtle text-sm leading-relaxed">
                    Yes, you can apply promo codes to any paid subscription plan. Each plan card has its own promo code field. Enter the code in the promo field on your chosen plan card, and the discount will be automatically applied before payment. Promo codes cannot be combined with other offers.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-xl px-4 bg-white hover:bg-surface-2 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-premium-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-protocall-premium-text font-bold text-sm">5</span>
                    </div>
                    <span className="font-semibold text-foreground">Is there a free trial available?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-subtle text-sm leading-relaxed">
                    Our Basic plan is completely free and gives you access to essential features. You can try it without any payment information required. When you're ready for advanced features, you can upgrade to Premium or VIP plans at any time.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-xl px-4 bg-white hover:bg-surface-2 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sell-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-sell-muted-foreground font-bold text-sm">6</span>
                    </div>
                    <span className="font-semibold text-foreground">What happens if my payment fails?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-subtle text-sm leading-relaxed">
                    If a payment fails, we'll send you an email notification immediately. You'll have a grace period to update your payment method. During this time, you'll retain access to your subscription features. If payment isn't resolved within the grace period, your account will be downgraded to the Basic plan.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <SubscriptionCheckoutModal
          open={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          plan={selectedPlan}
          cycle={billingCycle}
          onSuccess={() => {
            toast.success("Subscription updated successfully!");
            refreshSubscription();
            setShowCheckoutModal(false);
          }}
        />
      )}
    </div>
  );
}