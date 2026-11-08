import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Crown, UserCircle, Tag, Loader2, X, ChevronDown, Layers } from "lucide-react";
import { toast } from "sonner";
import { subscriptionApi, apiErrorMessage, priceView, normaliseCycle, rupees } from "@/lib/subscriptionApi";
import { cn } from "@/lib/utils";

// Feature key -> label. Unknown keys fall back to Title Case.
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
};

const getFeatureName = (feature) => {
  if (typeof feature !== 'string') return 'Feature';
  if (featureNameMap[feature]) return featureNameMap[feature];
  if (feature.includes(' ')) return feature;
  return feature.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const parseFeatures = (features) => {
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Tier order and the plan each tier builds on ("Everything in ...").
const TIERS = {
  basic: { order: 1, parent: null },
  free: { order: 1, parent: null },
  premium: { order: 2, parent: 'Free' },
  vip: { order: 3, parent: 'Premium' },
  elite: { order: 3, parent: 'Premium' },
};
const tierOf = (name) => TIERS[String(name || '').toLowerCase().trim()] || { order: 0, parent: null };

const VISIBLE_FEATURES = 6;

function PlanIcon({ name }) {
  const n = String(name || '').toLowerCase();
  if (n.includes('vip') || n.includes('elite')) {
    return <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Crown className="h-5 w-5" /></span>;
  }
  if (n.includes('premium')) {
    return <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span>;
  }
  return <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-subtle"><UserCircle className="h-5 w-5" /></span>;
}

export default function PlanCard({ plan, isCurrentPlan, currentPlanTier, onSelect, user, cycle = 'monthly', recommended = false }) {
  const { name, description, features } = plan;
  const selectedCycle = normaliseCycle(cycle);
  const isAnnual = selectedCycle === 'annually';

  // appliedPromo = { code, quotes: { monthly, annually } }. Both cycles are priced by the
  // server when the code is applied, so flipping the Monthly/Yearly toggle never needs a
  // client-side discount calculation.
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const quotes = appliedPromo ? appliedPromo.quotes : null;
  const monthlyView = priceView(plan, 'monthly', quotes);
  const annualView = priceView(plan, 'annually', quotes);
  const view = isAnnual ? annualView : monthlyView;

  const isFree = monthlyView.base === 0 && annualView.base === 0;
  const yearlySavingPct = monthlyView.base > 0 && annualView.base > 0
    ? Math.round(((monthlyView.base * 12 - annualView.base) / (monthlyView.base * 12)) * 100)
    : 0;

  const currentTier = tierOf(currentPlanTier);
  const thisTier = tierOf(name);
  const isIncluded = currentTier.order > thisTier.order;
  const isUpgrade = currentTier.order > 0 && currentTier.order < thisTier.order;
  const buttonState = isCurrentPlan ? 'current' : isIncluded ? 'included' : isUpgrade ? 'upgrade' : 'subscribe';
  const freeWithCode = Boolean(appliedPromo) && view.discounted && view.final === 0;

  const featureList = parseFeatures(features);
  const shownFeatures = showAllFeatures ? featureList : featureList.slice(0, VISIBLE_FEATURES);
  const hiddenCount = featureList.length - shownFeatures.length;
  const parentName = thisTier.parent;

  // The server decides validity and the discounted price.
  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) {
      toast.error('Please enter a promo code');
      return;
    }
    if (!user) {
      toast.error('Please log in to use promo codes');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError(null);
    try {
      const [monthly, annually] = await Promise.allSettled([
        subscriptionApi.validatePromo({ code, planId: plan.id, cycle: 'monthly' }),
        subscriptionApi.validatePromo({ code, planId: plan.id, cycle: 'annually' }),
      ]);
      const current = isAnnual ? annually : monthly;

      // The cycle the customer is looking at decides success; its error is the one to show.
      if (current.status === 'rejected') {
        const message = apiErrorMessage(current.reason, 'Could not apply this promo code. Please try again.');
        setAppliedPromo(null);
        setPromoError(message);
        toast.error(message);
        return;
      }

      setAppliedPromo({
        code: current.value.code || code,
        quotes: {
          monthly: monthly.status === 'fulfilled' ? monthly.value : null,
          annually: annually.status === 'fulfilled' ? annually.value : null,
        },
      });
      toast.success(current.value.message || `Promo ${code} applied`);
    } catch (error) {
      console.error('Error applying promo code:', error);
      setAppliedPromo(null);
      setPromoError('Could not apply this promo code. Please try again.');
      toast.error('Could not apply this promo code. Please try again.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
    setPromoOpen(false);
    toast.info('Promo removed');
  };

  // The code travels with the selection; checkout re-prices it on the server.
  const handleSelectPlan = () => onSelect(plan, selectedCycle, appliedPromo ? appliedPromo.code : null);

  const ctaLabel = {
    current: 'Current plan',
    included: 'Included in your plan',
    upgrade: freeWithCode ? 'Activate for free' : 'Upgrade',
    subscribe: freeWithCode ? 'Activate for free' : 'Get started',
  }[buttonState];

  return (
    <article
      aria-label={`${name} plan`}
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card p-5 transition-shadow lg:p-6',
        recommended
          ? 'border-2 border-primary shadow-xl shadow-primary/15 md:-mt-3 md:pb-8'
          : 'border-border shadow-sm hover:shadow-md',
        isCurrentPlan && 'ring-2 ring-primary/40'
      )}
    >
      {recommended && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-md">
          Most popular
        </span>
      )}

      {/* Header */}
      <header className="flex items-start gap-3">
        <PlanIcon name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold leading-tight text-foreground">{name}</h3>
            {isCurrentPlan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Check className="h-3 w-3" /> Your plan
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {description || (isFree ? 'Essential tools, free for everyone.' : 'Everything you need to trade with confidence.')}
          </p>
        </div>
      </header>

      {/* Price */}
      <div className="mt-5 min-h-[7.5rem]">
        {isFree ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground lg:text-5xl">₹0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">No card needed.</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2">
              {view.discounted && (
                <span className="text-lg font-semibold tabular-nums text-muted-foreground line-through">{rupees(view.base)}</span>
              )}
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground lg:text-5xl">{rupees(view.final)}</span>
              <span className="text-sm text-muted-foreground">{isAnnual ? '/year' : '/month'}</span>
            </div>

            <div className="mt-2 flex min-h-[1.75rem] flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {isAnnual ? (
                <>
                  <span>{rupees(Math.round((annualView.final / 12) * 100) / 100)}/month, billed yearly</span>
                  {yearlySavingPct > 0 && (
                    <span className="rounded-full bg-buy-muted px-2 py-0.5 text-xs font-semibold text-buy-muted-foreground">Save {yearlySavingPct}%</span>
                  )}
                </>
              ) : (
                yearlySavingPct > 0 && (
                  <span>
                    or {rupees(annualView.final)}/year{' '}
                    <span className="rounded-full bg-buy-muted px-2 py-0.5 text-xs font-semibold text-buy-muted-foreground">Save {yearlySavingPct}%</span>
                  </span>
                )
              )}
            </div>

            {view.discounted && (
              <p className="mt-1 text-sm font-medium text-buy-muted-foreground">
                {freeWithCode ? 'Free with your promo code' : `Promo saves you ${rupees(view.saving)}${isAnnual ? ' a year' : ' a month'}`}
              </p>
            )}
          </>
        )}
      </div>

      {/* Promo code (paid plans): collapsed until asked for */}
      {!isFree && (
        <div className="mt-3">
          {appliedPromo ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-medium text-primary">
                <Tag className="h-4 w-4 shrink-0" />
                <span className="truncate">{appliedPromo.code} applied</span>
              </span>
              <Button variant="ghost" size="sm" onClick={handleRemovePromo} aria-label="Remove promo code" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPromoOpen((open) => !open)}
                aria-expanded={promoOpen}
                className="flex items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Tag className="h-3.5 w-3.5" />
                Have a promo code?
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform motion-reduce:transition-none', promoOpen && 'rotate-180')} />
              </button>
              {promoOpen && (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      aria-label={`Promo code for ${name}`}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleApplyPromo(); }}
                      disabled={isValidatingPromo || !user}
                      className="h-9 text-sm"
                    />
                    <Button size="sm" onClick={handleApplyPromo} disabled={isValidatingPromo || !promoCode.trim() || !user} className="h-9 bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                      {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {!user && <p className="mt-1 text-xs text-muted-foreground">Log in to use a promo code.</p>}
                  {promoError && <p role="alert" className="mt-1 text-xs text-sell-muted-foreground">{promoError}</p>}
                </div>
              )}
            </>
          )}
          {appliedPromo && !view.discounted && (
            <p className="mt-1 text-xs text-muted-foreground">This code does not reduce the {isAnnual ? 'yearly' : 'monthly'} price on this plan.</p>
          )}
        </div>
      )}

      {/* Features */}
      <div className="mt-6 flex-1 border-t border-divider pt-5">
        <ul className="space-y-2.5">
          {parentName && (
            <li className="flex items-start gap-2.5 rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
              <Layers className="mt-0.5 h-4 w-4 shrink-0" />
              Everything in {parentName}, plus:
            </li>
          )}
          {shownFeatures.map((feature, index) => (
            <li key={`${feature}-${index}`} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {getFeatureName(feature)}
            </li>
          ))}
          {featureList.length === 0 && parentName && (
            <li className="text-sm italic text-muted-foreground">No additional unique features</li>
          )}
        </ul>
        {hiddenCount > 0 && (
          <button type="button" onClick={() => setShowAllFeatures(true)} className="mt-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Show {hiddenCount} more feature{hiddenCount === 1 ? '' : 's'}
          </button>
        )}
        {showAllFeatures && featureList.length > VISIBLE_FEATURES && (
          <button type="button" onClick={() => setShowAllFeatures(false)} className="mt-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Show fewer
          </button>
        )}
      </div>

      {/* Call to action, pinned to the bottom of every card */}
      <Button
        onClick={handleSelectPlan}
        disabled={isCurrentPlan || isIncluded}
        size="lg"
        className={cn(
          'mt-6 w-full font-semibold',
          buttonState === 'upgrade' || buttonState === 'subscribe'
            ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
            : 'border border-border bg-surface-2 text-muted-foreground hover:bg-surface-2 disabled:opacity-100'
        )}
      >
        {buttonState === 'current' && <Check className="mr-2 h-4 w-4" />}
        {ctaLabel}
      </Button>
    </article>
  );
}
