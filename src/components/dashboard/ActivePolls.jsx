import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getPollTally, optionTone } from "@/lib/pollVotes";

// Badge look for the leading option, by tone (Buy / Bullish / Yes ...).
const TONE_BADGE = {
  positive: { icon: TrendingUp, className: "bg-buy text-buy-foreground border-transparent" },
  negative: { icon: TrendingDown, className: "bg-sell-muted text-sell-muted-foreground border-sell/30" },
  neutral: { icon: Minus, className: "bg-hold-muted text-hold-muted-foreground border-hold/30" },
  other: { icon: null, className: "bg-premium-muted text-premium-muted-foreground border-premium-light" },
};

export default function ActivePolls({ polls }) {
  const pollData = Array.isArray(polls) ? polls.filter((p) => p && p.is_active !== false) : [];

  return (
    <Card className="h-full overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-divider px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-premium-muted">
            <BarChart3 className="h-4 w-4 text-premium" />
          </span>
          Active Polls
        </h2>
        <Link
          to={createPageUrl("Polls")}
          className="group flex items-center gap-1 rounded-full bg-premium-muted px-3 py-1 text-xs font-semibold text-premium-muted-foreground transition-colors hover:bg-premium-light"
        >
          View All
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <CardContent className="p-4 sm:p-5">
        {polls === null || polls === undefined ? (
          <div role="status" aria-label="Loading polls" className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : pollData.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-subtle">
            No active polls yet.
          </p>
        ) : (
          <div className="space-y-3">
            {pollData.slice(0, 4).map(poll => {
              const { total, leader } = getPollTally(poll);
              const tone = TONE_BADGE[leader ? optionTone(leader.label) : "none"] || TONE_BADGE.other;
              const LeaderIcon = tone.icon;

              return (
                <div key={poll.id} className="rounded-xl border border-divider bg-card p-3 transition-colors hover:border-premium-light hover:bg-premium-muted/40">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">{poll.title}</h4>
                      {poll.stock_symbol && (
                        <Badge variant="outline" className="text-xs">
                          {poll.stock_symbol}
                        </Badge>
                      )}
                    </div>
                    {leader && (
                      <Badge variant="outline" className={`shrink-0 text-xs ${tone.className}`}>
                        {LeaderIcon && <LeaderIcon className="h-3 w-3" />}
                        <span className="ml-1">{leader.tie ? "Tied" : leader.label}</span>
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-subtle">
                    <span>{total} {total === 1 ? "vote" : "votes"}</span>
                    <span>{leader ? `${leader.rounded}% consensus` : "No votes yet"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}