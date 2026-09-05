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

  const handleSelectPlan = (plan, cycle = billingCycle) => {
    if (!user) {
      toast.error("Please log in to subscribe");
      return;
    }

    const price = plan.price_monthly !== undefined ? plan.price_monthly : plan.price;

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlanTier = subscription?.status === 'active' ? subscription.plan_type : 'Free';
  const isCurrentActive = subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      {/* Login Prompt for Non-Authenticated Users */}
      {!user && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-900">Explore Our Plans</p>
                <p className="text-xs text-purple-700 mt-1">Log in to subscribe and unlock premium features</p>
              </div>
              <Link to={createPageUrl("Profile")}>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
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
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Premium Features</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
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
            <div className="mb-8">
              <UserSubscriptionHistory />
            </div>
          </>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center">
          <div className="bg-white p-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-3">
            <span className={`text-sm px-3 py-1 font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <Switch
              checked={billingCycle === 'annually'}
              onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
              className="data-[state=checked]:bg-indigo-600"
            />
            <span className={`text-sm px-3 py-1 font-semibold transition-colors flex items-center gap-1 ${billingCycle === 'annually' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
              <span className="text-green-600 text-[10px] bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100 uppercase tracking-tight font-bold">
                Save 16%
              </span>
            </span>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto plans-grid">
          {plans.map((plan) => {
            const baseMonthlyPrice = Number(plan.price_monthly !== undefined ? plan.price_monthly : plan.price) || 0;
            const baseAnnualPrice = Number(plan.price_annually !== undefined ? plan.price_annually : baseMonthlyPrice * 12 * 0.84) || 0;

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
              />
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle className="text-center text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </CardTitle>
            <p className="text-center text-sm text-gray-600 mt-2">
              Click on any question to view the answer
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="item-1" className="border rounded-xl px-4 bg-white hover:bg-gray-50 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-sm">1</span>
                    </div>
                    <span className="font-semibold text-gray-900">Can I cancel anytime?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period, so you can enjoy all premium features until then. No hidden fees or penalties for cancellation.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-xl px-4 bg-white hover:bg-gray-50 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold text-sm">2</span>
                    </div>
                    <span className="font-semibold text-gray-900">What payment methods do you accept?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payment gateway. All transactions are encrypted and PCI-DSS compliant for your security.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-xl px-4 bg-white hover:bg-gray-50 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold text-sm">3</span>
                    </div>
                    <span className="font-semibold text-gray-900">Can I upgrade or downgrade my plan?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes, you can change your plan at any time. When upgrading, you'll get immediate access to premium features. When downgrading, changes take effect at the end of your current billing cycle. Pro-rated credits are applied automatically.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-xl px-4 bg-white hover:bg-gray-50 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold text-sm">4</span>
                    </div>
                    <span className="font-semibold text-gray-900">Do promo codes work on all plans?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes, you can apply promo codes to any paid subscription plan. Each plan card has its own promo code field. Enter the code in the promo field on your chosen plan card, and the discount will be automatically applied before payment. Promo codes cannot be combined with other offers.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-xl px-4 bg-white hover:bg-gray-50 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-pink-600 font-bold text-sm">5</span>
                    </div>
                    <span className="font-semibold text-gray-900">Is there a free trial available?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Our Basic plan is completely free and gives you access to essential features. You can try it without any payment information required. When you're ready for advanced features, you can upgrade to Premium or VIP plans at any time.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border rounded-xl px-4 bg-white hover:bg-gray-50 transition-colors">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-bold text-sm">6</span>
                    </div>
                    <span className="font-semibold text-gray-900">What happens if my payment fails?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-11 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
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