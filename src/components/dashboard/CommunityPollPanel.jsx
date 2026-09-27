import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3 } from "lucide-react";
import { createPageUrl } from "@/utils";

// BUY / HOLD / SELL keep their palette meaning from the design system.
const LEGEND = [
  { key: "buy", label: "BUY", dot: "bg-buy", bar: "bg-buy" },
  { key: "hold", label: "HOLD", dot: "bg-hold", bar: "bg-hold" },
  { key: "sell", label: "SELL", dot: "bg-sell", bar: "bg-sell" },
];

const SAMPLE_POLL = {
  id: "sample",
  title: "RELIANCE – Buy or Sell?",
  total_votes: 14532,
  buy_votes: 9300,
  hold_votes: 3342,
  sell_votes: 1890,
  ends_in: "Ends in 12h 24m",
};

export default function CommunityPollPanel({ polls = [] }) {
  const source = Array.isArray(polls) && polls.length > 0 ? polls[0] : SAMPLE_POLL;

  const buy = Number(source.buy_votes || 0);
  const hold = Number(source.hold_votes || 0);
  const sell = Number(source.sell_votes || 0);
  const total = Number(source.total_votes || buy + hold + sell) || 0;

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const values = { buy: pct(buy), hold: pct(hold), sell: pct(sell) };

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Community Polls
          </h3>
          <Link
            to={createPageUrl("Polls")}
            className="group flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            View All
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="text-sm font-semibold text-foreground">
          {source.title || source.stock_symbol || "Community poll"}
        </p>
        <p className="mt-0.5 text-xs text-subtle">
          {total.toLocaleString("en-IN")} votes
          {source.ends_in ? ` · ${source.ends_in}` : ""}
        </p>

        <div className="mt-4 space-y-3">
          {LEGEND.map(({ key, label, dot, bar }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="flex w-14 shrink-0 items-center gap-1.5 text-[11px] font-bold text-subtle">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {label}
              </span>
              <div
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={values[key]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} ${values[key]} percent`}
              >
                <div
                  className={`h-full rounded-full ${bar} transition-[width] duration-500`}
                  style={{ width: `${values[key]}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                {values[key]}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
