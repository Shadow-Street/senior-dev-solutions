import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/context/AuthContext";
import { useSubscription } from "@/components/hooks/useSubscription";
import apiClient from "@/lib/apiClient";
import { createPageUrl } from "@/utils";
import SubscriptionCheckoutModal from "@/components/subscription/SubscriptionCheckoutModal";
import PlanCard from "@/components/subscription/PlanCard";
import CurrentSubscriptionCard from "@/components/subscription/CurrentSubscriptionCard";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Crown, Loader2, AlertCircle, RefreshCw, ShieldCheck, RefreshCcw, CreditCard, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFreeSubscription } from "@/lib/subscriptionApi";
import { toast } from "sonner";

const FAQ = [
  ['Can I cancel anytime?', 'Yes. Cancel whenever you like. If you cancel early you may be refunded for the unused part of your period; otherwise you keep access until it ends. No hidden fees.'],
  ['What payment methods do you accept?', 'Cards, UPI, net banking and wallets through Razorpay. Payments are encrypted and we never see or store your card details.'],
  ['Can I upgrade or downgrade?', 'Yes, at any time. Choosing a different plan replaces your current one from the moment your payment is confirmed.'],
  ['How do promo codes work?', 'Open "Have a promo code?" on a paid plan, enter it and press Apply. The discount is worked out by our server and shown on the card before you pay. A code that covers the whole price activates the plan with no payment.'],
  ['Is there a free trial?', 'The Free plan is free forever and needs no payment details. Upgrade to Premium or VIP whenever you want more.'],
  ['What if a payment fails?', 'You will not be charged and nothing changes on your account. Try again, or contact support with your payment id if money left your account.'],
];

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annually'
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get('/subscriptions/plans');
      // Sort plans: Free -> Premium -> VIP
      const sortedPlans = [...(Array.isArray(data) ? data : [])].sort((a, b) => {
        const priceA = a.price_monthly !== undefined ? a.price_monthly : a.price;
        const priceB = b.price_monthly !== undefined ? b.price_monthly : b.price;
        return (Number(priceA) || 0) - (Number(priceB) || 0);
      });
      setPlans(sortedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      setLoadError(error?.response?.data?.error || "We could not load the plans. Check your connection and try again.");
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

  const handleSelectPlan = (plan, cycle = billingCycle, promo = null) => {
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
    setSelectedPromo(promo);
    setBillingCycle(cycle);
    setShowCheckoutModal(true);
  };

  const handleRenew = () => {
    const currentName = String(subscription?.plan_type || '').toLowerCase();
    if (currentName && plans.length > 0) {
      const planToRenew = plans.find(p => String(p.name || '').toLowerCase() === currentName);
      if (planToRenew) {
        handleSelectPlan(planToRenew);
        return;
      }
    }
    const fallbackPlan = plans.find(p => String(p.name || '').toLowerCase().includes('premium')) || plans[1];
    if (fallbackPlan) {
      handleSelectPlan(fallbackPlan);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will lose access to premium features at the end of the billing period.")) return;

    try {
      const { data } = await apiClient.post('/subscriptions/cancel', { reason: 'User requested cancellation' });
      if (data?.pending) toast.success(data.message || "Subscription cancelled. Your refund is being confirmed.");
      else if (data?.refundId) toast.success(`Subscription cancelled. A refund of ₹${data.amount} has been started.`);
      else toast.success("Subscription cancelled. You keep access until the end of your billing period.");
      refreshSubscription();
    } catch (error) {
      console.error("Cancellation error:", error);
      toast.error(error.response?.data?.error || "Failed to cancel subscription");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" aria-label="Loading plans" />
      </div>
    );
  }

  const currentPlanTier = subscription?.status === 'active' ? subscription.plan_type : 'Free';
  const isCurrentActive = subscription?.status === 'active';
  const onFree = isFreeSubscription(subscription);
  const popularIndex = (() => {
    const byName = plans.findIndex((p) => /premium/i.test(p.name));
    if (byName >= 0) return byName;
    return plans.length >= 3 ? 1 : -1;
  })();

  const toggleClass = (active) => cn(
    'rounded-full border-2 px-5 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-7',
    active
      ? 'border-primary bg-primary text-white shadow-md'
      : 'border-primary/40 bg-card text-primary hover:bg-primary/10'
  );

  return (
    <div className="w-full bg-background px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Crown className="h-4 w-4" /> Plans &amp; pricing
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Choose the plan that fits how you trade
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Start free and upgrade when you want advisor picks, premium rooms and exclusive content. Change or cancel any time.
          </p>

          {user ? (
            <p className="mt-4 text-sm text-muted-foreground">
              You are on the{' '}
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
                {onFree ? 'Free' : (subscription?.plan_type || 'Free')} plan
              </span>
            </p>
          ) : (
            <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left">
              <p className="flex-1 text-sm text-foreground">Log in to subscribe and unlock premium features.</p>
              <Link to={createPageUrl("Profile")}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Log in</Button>
              </Link>
            </div>
          )}
        </header>

        {/* Paid plans get the full status card (renew / cancel). Free is shown on the card and in the hero. */}
        {subscription && !onFree && (
          <div className="mt-8">
            <CurrentSubscriptionCard
              subscription={subscription}
              onRenew={handleRenew}
              onCancel={handleCancelSubscription}
            />
          </div>
        )}

        {/* Billing cycle: selected = filled primary with white text; the other keeps visible text and an outline */}
        <div className="mt-8 flex justify-center">
          <div role="group" aria-label="Billing cycle" className="inline-flex items-center gap-1 rounded-full border-2 border-primary/30 bg-card p-1 shadow-sm">
            <button type="button" aria-pressed={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')} className={toggleClass(billingCycle === 'monthly')}>
              Monthly
            </button>
            <button type="button" aria-pressed={billingCycle === 'annually'} onClick={() => setBillingCycle('annually')} className={cn(toggleClass(billingCycle === 'annually'), 'flex items-center gap-2')}>
              Yearly
              {maxAnnualSavings > 0 && (
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight', billingCycle === 'annually' ? 'bg-white/20 text-white' : 'bg-buy-muted text-buy-muted-foreground')}>
                  Save {maxAnnualSavings}%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans */}
        {loadError && (
          <div role="alert" className="mx-auto mt-10 max-w-xl rounded-2xl border border-sell/30 bg-sell-muted p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-sell-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Plans could not be loaded</h2>
            <p className="mt-1 text-sm text-sell-muted-foreground">{loadError}</p>
            <Button onClick={fetchPlans} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        )}

        {!loadError && plans.length === 0 && (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Crown className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">No plans are available right now</h2>
            <p className="mt-1 text-sm text-muted-foreground">Please check back soon. You can keep using everything on your current plan.</p>
          </div>
        )}

        <section aria-label="Plans" className="plans-grid mx-auto mt-10 grid max-w-5xl grid-cols-1 items-stretch gap-8 md:mt-12 md:grid-cols-3 md:gap-4 lg:gap-7">
          {plans.map((plan, index) => {
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
                recommended={index === popularIndex}
                isCurrentPlan={isCurrentActive && (plan.name || '').toLowerCase() === (subscription?.plan_type || '').toLowerCase()}
                currentPlanTier={currentPlanTier}
                onSelect={(p, c, promo) => handleSelectPlan(p, c || billingCycle, promo)}
                user={user}
                cycle={billingCycle}
              />
            );
          })}
        </section>

        {/* Reassurance */}
        <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="flex items-center justify-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Secure payments by Razorpay</li>
          <li className="flex items-center justify-center gap-2"><RefreshCcw className="h-4 w-4 text-primary" /> Cancel any time</li>
          <li className="flex items-center justify-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Cards, UPI and net banking</li>
        </ul>
        {user && (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            Invoices and payment details are in your{' '}
            <Link to={`${createPageUrl("Profile")}?tab=subscription`} className="font-medium text-primary hover:underline">Profile</Link>.
          </p>
        )}

        {/* FAQ */}
        <section aria-label="Frequently asked questions" className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-foreground">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-6 w-full space-y-2">
            {FAQ.map(([question, answer], i) => (
              <AccordionItem key={question} value={`faq-${i}`} className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="py-4 text-left font-semibold text-foreground hover:no-underline">{question}</AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <SubscriptionCheckoutModal
          open={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          plan={selectedPlan}
          cycle={billingCycle}
          initialCoupon={selectedPromo}
          onSuccess={() => {
            refreshSubscription();
            setShowCheckoutModal(false);
          }}
        />
      )}
    </div>
  );
}
