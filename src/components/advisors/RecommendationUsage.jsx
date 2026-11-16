import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import PropTypes from 'prop-types';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { formatIstDate, limitLabel } from './usageHelpers';

/**
 * Recommendation usage tracker (one card per advisor plan).
 *
 * The server owns the numbers (GET /advisors/posts/usage): a plan may allow N
 * recommendations per week (monthly cap 4 x N) or per month. Weeks run Monday to
 * Sunday and months are calendar months, in India time. This file only renders.
 */

function UsageRow({ label, counter, testId }) {
  const capped = counter.cap !== null && counter.cap !== undefined;
  const pct = capped && counter.cap > 0 ? Math.min(100, Math.round((counter.used / counter.cap) * 100)) : 0;
  const full = capped && counter.used >= counter.cap;
  return (
    <div data-testid={testId} className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-subtle">{label}</span>
        <span className="font-semibold text-foreground">{capped ? `${counter.used}/${counter.cap} used` : `${counter.used} posted`}</span>
      </div>
      {capped ? (
        <Progress
          value={pct}
          role="progressbar"
          aria-label={`${label} usage`}
          aria-valuemin={0}
          aria-valuemax={counter.cap}
          aria-valuenow={Math.min(counter.used, counter.cap)}
          className="h-2"
          indicatorClassName={full ? 'bg-sell' : pct >= 75 ? 'bg-hold' : 'bg-buy'}
        />
      ) : (
        <p className="text-xs text-muted-foreground">No cap</p>
      )}
    </div>
  );
}

export function RecommendationUsageCard({ plan }) {
  const unlimited = !plan.limit_count;
  return (
    <Card data-testid={`usage-card-${plan.plan_id}`} className={plan.is_active ? '' : 'opacity-75'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My Advisor Plan</p>
          <Badge className={plan.is_active ? 'bg-buy-muted text-buy-muted-foreground border-0' : 'bg-surface-2 text-subtle border-0'}>
            {plan.is_active ? 'Published' : 'Inactive'}
          </Badge>
        </div>
        <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
        <p className="text-sm text-subtle">{limitLabel(plan)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-semibold text-foreground">Recommendation usage</p>
        <UsageRow label="This week" counter={plan.week} testId="usage-week" />
        <UsageRow label="This month" counter={plan.month} testId="usage-month" />
        {unlimited ? (
          <p className="text-sm font-medium text-foreground">Unlimited</p>
        ) : (
          <div className="space-y-1 text-sm">
            {plan.month.cap !== null && (
              <p><span className="font-bold text-foreground">{plan.month.remaining}</span> <span className="text-subtle">Monthly posts remaining</span></p>
            )}
            {plan.week.cap !== null && (
              <p><span className="font-bold text-foreground">{plan.week.remaining}</span> <span className="text-subtle">Weekly posts remaining</span></p>
            )}
          </div>
        )}
        <div className="border-t pt-3 text-xs text-muted-foreground space-y-0.5">
          {plan.week.cap !== null && <p>Week resets {formatIstDate(plan.week.resets_at)}</p>}
          <p>Month resets {formatIstDate(plan.month.resets_at)}</p>
          {plan.effective_from && <p>Limit in force since {formatIstDate(plan.effective_from)}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Section for the dashboard: loading, error, empty and data states. `query` is a react-query result. */
export default function RecommendationUsageSection({ query, onCreatePlan }) {
  const plans = query.data?.plans || [];
  return (
    <section aria-labelledby="usage-heading" className="space-y-3">
      <div>
        <h2 id="usage-heading" className="text-xl font-bold text-foreground">Recommendation usage</h2>
        <p className="text-sm text-subtle">Published subscriber-only recommendations against each plan allowance. Weeks run Monday to Sunday; months are calendar months (India time).</p>
      </div>
      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 bg-border rounded" />)}
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-hold/30 bg-hold-muted p-3 text-sm text-hold-muted-foreground">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />
            {query.error?.response?.status === 503 ? 'The usage tracker is not available yet. Publishing still works.' : 'We could not load your recommendation usage.'}
          </span>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>Retry</Button>
        </div>
      ) : plans.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-subtle">Create a plan to start tracking recommendations.</p>
          {onCreatePlan && <Button onClick={onCreatePlan} className="mt-4">Create a plan</Button>}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => <RecommendationUsageCard key={plan.plan_id} plan={plan} />)}
        </div>
      )}
    </section>
  );
}

const counterShape = PropTypes.shape({
  used: PropTypes.number.isRequired,
  cap: PropTypes.number,
  remaining: PropTypes.number,
  resets_at: PropTypes.string,
});

UsageRow.propTypes = {
  label: PropTypes.string.isRequired,
  counter: counterShape.isRequired,
  testId: PropTypes.string,
};

RecommendationUsageCard.propTypes = {
  plan: PropTypes.shape({
    plan_id: PropTypes.string.isRequired,
    plan_name: PropTypes.string,
    is_active: PropTypes.bool,
    limit_count: PropTypes.number,
    limit_period: PropTypes.string,
    effective_from: PropTypes.string,
    week: counterShape.isRequired,
    month: counterShape.isRequired,
  }).isRequired,
};

RecommendationUsageSection.propTypes = {
  query: PropTypes.shape({
    data: PropTypes.shape({ plans: PropTypes.array }),
    isLoading: PropTypes.bool,
    isError: PropTypes.bool,
    error: PropTypes.shape({ response: PropTypes.shape({ status: PropTypes.number }) }),
    refetch: PropTypes.func,
  }).isRequired,
  onCreatePlan: PropTypes.func,
};
