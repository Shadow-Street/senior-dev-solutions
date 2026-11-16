import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Target, TrendingUp, TrendingDown, Eye, Crown, Lock, Sparkles } from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSubscription } from "@/components/hooks/useSubscription";
import { formatINR } from "@/lib/format";

// Decorative preview behind the lock for free accounts only (blurred and
// hidden from assistive tech). Never shown as real data.
const PREVIEW = [
  { id: 'p1', stock_symbol: 'RELIANCE', action: 'buy', target_price: 2800, timeframe: 'medium_term', reason: 'Strong buy recommendation' },
  { id: 'p2', stock_symbol: 'HDFCBANK', action: 'buy', target_price: 1850, timeframe: 'long_term', reason: 'Banking sector, selective approach' },
  { id: 'p3', stock_symbol: 'TCS', action: 'hold', target_price: 3600, timeframe: 'short_term', reason: 'IT stocks, wait and watch' },
];

const ACTION_STYLE = {
  buy: ['bg-buy text-buy-foreground border-transparent', TrendingUp],
  sell: ['bg-sell-muted text-sell-muted-foreground border-sell/30', TrendingDown],
  watch: ['bg-premium-muted text-premium-muted-foreground border-premium/30', Eye],
};

/** Recommendation rows carry `action`; older/demo rows used `recommendation_type`. */
const actionOf = (rec) => String(rec.action || rec.recommendation_type || 'hold').toLowerCase();
const advisorName = (rec) => rec.Advisor?.display_name || rec.Advisor?.name || null;
const horizon = (rec) => String(rec.timeframe || rec.time_horizon || '').replace(/_/g, ' ');

function renderPick(rec) {
  const action = actionOf(rec);
  const [style, Icon] = ACTION_STYLE[action] || ['bg-hold-muted text-hold-muted-foreground border-hold/30', Target];
  return (
    <div key={rec.id} className="rounded-lg border border-divider bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-semibold">{rec.stock_symbol}</Badge>
        <Badge variant="outline" className={`text-xs ${style}`}>
          <Icon className="h-3 w-3" aria-hidden="true" />
          <span className="ml-1 capitalize">{action}</span>
        </Badge>
      </div>
      {(rec.reason || rec.title) && (
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{rec.reason || rec.title}</p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {rec.target_price != null && rec.target_price !== '' && (
          <>
            <dt className="text-subtle">Target</dt>
            <dd className="text-right font-semibold text-positive">{formatINR(rec.target_price)}</dd>
          </>
        )}
        {rec.stop_loss != null && rec.stop_loss !== '' && (
          <>
            <dt className="text-subtle">Stop loss</dt>
            <dd className="text-right font-semibold text-sell-muted-foreground">{formatINR(rec.stop_loss)}</dd>
          </>
        )}
      </dl>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-subtle">
        <span className="truncate">{advisorName(rec) ? `by ${advisorName(rec)}` : ''}</span>
        <span className="shrink-0 capitalize">{horizon(rec)}</span>
      </div>
    </div>
  );
}

/**
 * Dashboard "Advisor Picks". Premium, VIP and staff see the latest active calls
 * from approved advisors; everyone else sees a locked preview. It used to be
 * locked for every account, paying subscribers included (no access check),
 * and laid out demo-only fields that real recommendations do not have.
 */
export default function AdvisorRecommendations({ recommendations }) {
  const { hasPremiumAccess } = useSubscription() || {};
  const unlocked = typeof hasPremiumAccess === 'function' && hasPremiumAccess();
  const picks = Array.isArray(recommendations) ? recommendations : [];

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-divider bg-gradient-to-r from-buy-muted/70 to-card px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-5 w-5 text-positive" aria-hidden="true" />
          Advisor Picks
          <Crown className="h-4 w-4 text-premium" aria-hidden="true" />
        </h2>
        <Badge className="border-transparent bg-premium-muted text-xs font-semibold text-premium-muted-foreground hover:bg-premium-muted">
          {unlocked ? 'Premium' : 'Premium Only'}
        </Badge>
      </div>

      {unlocked ? (
        <CardContent className="space-y-3 p-4 sm:p-5">
          {picks.length > 0 ? (
            <>
              {picks.slice(0, 3).map(renderPick)}
              <Link to={createPageUrl("Advisors")} className="block pt-1 text-center text-sm font-semibold text-primary hover:underline">
                See all advisors
              </Link>
            </>
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
              <Shield className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold text-foreground">No advisor picks yet</p>
              <p className="mt-1 max-w-[16rem] text-sm text-subtle">New calls from SEBI-registered advisors appear here as soon as they are published.</p>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent className="relative min-h-[380px] p-4 sm:p-5">
          <div aria-hidden="true" className="pointer-events-none select-none space-y-3 blur-[3px]">
            {PREVIEW.map(renderPick)}
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-card/75 p-6 backdrop-blur-[2px]">
            <div className="max-w-[18rem] text-center">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/15">
                <Shield className="h-8 w-8" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <h3 className="mb-2 flex items-center justify-center gap-1.5 text-lg font-bold text-foreground">
                <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                Premium Feature
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-subtle">
                Get expert stock picks from SEBI-registered advisors with detailed analysis and price targets
              </p>
              <Link
                to={createPageUrl("Subscription")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/40 transition-colors
                           hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Crown className="h-4 w-4" aria-hidden="true" />
                Unlock Premium Access
              </Link>
              <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Includes all premium features
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
