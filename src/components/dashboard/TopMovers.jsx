import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

const money = (value, currency = "USD") => {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Unknown currency code from the provider — fall back to a plain number.
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};

function MoversTable({ title, rows, positive, isLoading, error }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  const accent = positive ? "text-positive" : "text-sell-muted-foreground";

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${accent}`}>
          <Icon className="h-4 w-4" />
          {title}
        </h3>

        {error ? (
          <div className="flex items-start gap-2 py-6 text-sm text-sell-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 py-1" aria-busy="true" aria-label={`Loading ${title}`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
                <div className="h-4 w-20 animate-pulse rounded bg-surface-2" />
                <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No {positive ? "gainers" : "losers"} right now.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[17rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-divider text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="pb-2 text-left font-semibold">Symbol</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Price</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((s, i) => {
                  const pct = Number(s.change_percent || 0);
                  return (
                    <tr
                      key={`${s.symbol}-${i}`}
                      className="border-b border-divider/60 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <td className="py-2 pr-2">
                        <span className="font-semibold text-foreground">{s.symbol}</span>
                        {s.name && s.name !== s.symbol && (
                          <span className="block max-w-[10rem] truncate text-[11px] text-muted-foreground">
                            {s.name}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-subtle">
                        {money(s.current_price, s.currency)}
                      </td>
                      <td
                        className={`py-2 pl-2 text-right font-semibold tabular-nums ${
                          pct >= 0 ? "text-positive" : "text-sell-muted-foreground"
                        }`}
                      >
                        {pct >= 0 ? "+" : ""}
                        {pct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TopMovers({ gainers = [], losers = [], isLoading = false, error = null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      <MoversTable title="Top Gainers" rows={gainers} positive isLoading={isLoading} error={error} />
      <MoversTable title="Top Losers" rows={losers} positive={false} isLoading={isLoading} error={error} />
    </div>
  );
}
