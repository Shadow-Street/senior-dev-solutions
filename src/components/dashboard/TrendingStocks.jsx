import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Watchlist } from "@/lib/apiClient";
import MarketStatusBadge from "@/components/stocks/MarketStatusBadge";

// Price follows the quote's own currency, like the ticker and movers tables;
// the symbol universe is configurable server-side, so it is not always INR.
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
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};

function Header() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5 sm:px-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-premium-muted">
          <TrendingUp className="h-4 w-4 text-premium" />
        </span>
        Trending Stocks
      </h2>
      <MarketStatusBadge />
    </div>
  );
}

export default function TrendingStocks({ stocks = [] }) {
  const navigate = useNavigate();

  // Symbols already on the signed-in user's watchlist, so Watch can show state.
  const [watched, setWatched] = useState(() => new Set());
  const [pending, setPending] = useState(null);
  const signedIn = Boolean(localStorage.getItem("accessToken"));

  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    Watchlist.filter({ fields: "symbols" })
      .then((lists) => {
        const symbols = (Array.isArray(lists) && lists[0]?.stocks) || [];
        if (alive) setWatched(new Set(symbols.map((s) => (typeof s === "string" ? s : s?.symbol)).filter(Boolean)));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [signedIn]);

  const handleWatch = async (stock) => {
    if (!signedIn) {
      toast.info("Sign in to build your watchlist.");
      navigate("/login");
      return;
    }
    if (watched.has(stock.symbol)) {
      toast.info(`${stock.symbol} is already on your watchlist.`);
      return;
    }
    setPending(stock.symbol);
    try {
      await Watchlist.create({ stock_symbol: stock.symbol });
      setWatched((prev) => new Set(prev).add(stock.symbol));
      toast.success(`${stock.symbol} added to your watchlist.`);
    } catch (error) {
      toast.error(error?.response?.data?.error || `Could not add ${stock.symbol} to your watchlist.`);
    } finally {
      setPending(null);
    }
  };

  // Opens this stock's room (ChatRooms resolves ?stock_symbol=).
  const handleDiscuss = (stock) => {
    navigate(`${createPageUrl("ChatRooms")}?stock_symbol=${encodeURIComponent(stock.symbol)}`);
  };

  if (!stocks || stocks.length === 0) {
    return (
      <Card className="overflow-hidden border border-border bg-card shadow-sm">
        <Header />
        <CardContent className="p-6 text-center text-sm text-subtle">
          No trending data available right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <Header />
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {stocks.slice(0, 6).map((stock, index) => {
            const pct = parseFloat(stock.change_percent || 0);
            const positive = pct >= 0;
            return (
              <div
                key={stock.symbol || index}
                className={`group rounded-xl border p-3.5 transition-shadow duration-200 hover:shadow-md sm:p-4 ${
                  positive ? "border-buy/60 bg-buy-muted" : "border-sell/20 bg-sell-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-bold text-foreground">{stock.symbol}</h4>
                    <p className="truncate text-xs text-subtle">
                      {stock.name || stock.company_name || stock.symbol}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold tabular-nums text-foreground">
                      {money(stock.current_price, stock.currency)}
                    </p>
                    {/* Green fill #56E11B + #101018 ink (10.98:1);
                        Loss Background #FEECEC + Loss Text #B91C1C. */}
                    <span
                      className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        positive
                          ? "border-transparent bg-buy text-buy-foreground"
                          : "border-sell/30 bg-card text-sell-muted-foreground"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {pct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Always visible on every card (client request): hover-only
                    actions were undiscoverable and absent on most cards. */}
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleWatch(stock)}
                    disabled={pending === stock.symbol}
                    aria-pressed={watched.has(stock.symbol)}
                    aria-label={watched.has(stock.symbol) ? `${stock.symbol} is on your watchlist` : `Add ${stock.symbol} to watchlist`}
                    className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card text-xs font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
                  >
                    <Star className={`h-3 w-3 ${watched.has(stock.symbol) ? "fill-protocall-neon text-protocall-neon-edge" : ""}`} />
                    {watched.has(stock.symbol) ? "Watching" : "Watch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscuss(stock)}
                    aria-label={`Open the ${stock.symbol} chat room`}
                    className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card text-xs font-semibold text-foreground transition-colors hover:border-premium-light hover:bg-premium-muted hover:text-premium-muted-foreground"
                  >
                    <MessageSquare className="h-3 w-3" /> Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
