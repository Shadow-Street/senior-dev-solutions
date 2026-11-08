import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BarChart3, Minus, TrendingDown, TrendingUp, Trophy, UserCheck, Vote } from "lucide-react";
import { createPageUrl } from "@/utils";
import { getPollTally } from "@/lib/pollVotes";

// Buy / Bullish / Yes, Sell / Bearish / No and Hold / Neutral keep their
// palette meaning from the design system; any other option uses the primary.
const TONES = {
  positive: { icon: TrendingUp, chip: "bg-buy text-buy-foreground", bar: "bg-buy" },
  neutral: { icon: Minus, chip: "bg-hold-muted text-hold-muted-foreground", bar: "bg-hold" },
  negative: { icon: TrendingDown, chip: "bg-sell-muted text-sell-muted-foreground", bar: "bg-sell" },
  other: { icon: BarChart3, chip: "bg-premium-muted text-premium-muted-foreground", bar: "bg-primary" },
};

// Same card shell for every state so the dashboard row does not jump.
function renderShell(children) {
  return (
    <Card className="h-full overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-premium-muted">
              <BarChart3 className="h-4 w-4 text-premium" />
            </span>
            Community Polls
          </h3>
          <Link
            to={createPageUrl("Polls")}
            className="group flex items-center gap-1 rounded-full bg-premium-muted px-3 py-1 text-xs font-semibold text-premium-muted-foreground transition-colors hover:bg-premium-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View All
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function renderStat(Icon, label, value) {
  return (
    <div className="min-w-0 rounded-xl border border-divider bg-surface-2/60 px-2 py-2.5 text-center">
      <Icon aria-hidden="true" className="mx-auto mb-1 h-3.5 w-3.5 text-muted-foreground" />
      <p className="truncate text-sm font-bold tabular-nums text-foreground" title={String(value)}>{value}</p>
      <p className="truncate text-[11px] font-medium text-subtle">{label}</p>
    </div>
  );
}

/**
 * Props: polls - array of polls, newest first; null while they are loading.
 * Shows the newest poll; all numbers come from getPollTally, the same helper
 * the Polls page cards use, so the two always agree.
 */
export default function CommunityPollPanel({ polls }) {
  if (polls === null || polls === undefined) {
    return renderShell(
      <div role="status" aria-label="Loading community poll" className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  const source = Array.isArray(polls) ? polls.find((p) => p && p.is_active !== false) : null;

  if (!source) {
    return renderShell(
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <Vote aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">No active polls yet</p>
        <p className="text-xs text-subtle">Start a poll to see what the community thinks.</p>
      </div>
    );
  }

  const { options, total, uniqueVoters, leader } = getPollTally(source);
  const title = source.title || source.stock_symbol || "Community poll";
  const initial = String(source.stock_symbol || title).trim().charAt(0).toUpperCase() || "P";
  const consensus = leader ? `${leader.tie ? "Tied" : leader.label} ${leader.rounded}%` : "No votes";

  return renderShell(
    <>
      <div className="flex items-center gap-3 rounded-xl border border-divider bg-surface-2/60 p-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-protocall-blue to-protocall-deep text-sm font-bold text-white"
        >
          {initial}
        </span>
        <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug text-foreground">{title}</p>
      </div>

      <div className="mt-4 space-y-3">
        {options.map((option) => {
          const { icon: Icon, chip, bar } = TONES[option.tone] || TONES.other;
          return (
            <div key={option.index} className="flex items-center gap-3">
              <span className="flex w-20 shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase text-foreground">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${chip}`}>
                  <Icon className="h-3 w-3" strokeWidth={2.75} />
                </span>
                <span className="truncate">{option.label}</span>
              </span>
              <div
                className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-divider"
                role="progressbar"
                aria-valuenow={option.rounded}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${option.label} ${option.rounded} percent`}
              >
                <div
                  className={`h-full rounded-full ${bar} transition-[width] duration-500`}
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {option.rounded}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {renderStat(Vote, "Total Votes", total.toLocaleString("en-IN"))}
        {renderStat(Trophy, "Consensus", consensus)}
        {renderStat(UserCheck, "Participated", uniqueVoters.toLocaleString("en-IN"))}
      </div>
    </>
  );
}
