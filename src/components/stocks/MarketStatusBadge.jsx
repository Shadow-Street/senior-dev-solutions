import { useEffect, useState } from "react";
import { stockAPI } from "./LiveStockAPI";

/**
 * One market-status pill for every surface that shows it (ticker, trending
 * stocks, app header), so the colours cannot drift apart:
 *   open   → green #56E11B fill, #101018 ink, pulsing dot   (BUY / Live semantics)
 *   closed → Loss Background #FEECEC, Loss Text #B91C1C, #EF4444 dot (SELL red)
 *
 * The closed state uses the tinted red rather than a solid #EF4444 fill: white
 * on #EF4444 is 3.76:1, under AA for text this small, while #B91C1C on
 * #FEECEC is 5.68:1 and still reads unmistakably red.
 *
 * Status is re-derived every minute so a page left open across 09:15 / 15:30
 * IST flips on its own.
 */
export default function MarketStatusBadge({ openLabel = "Market Open", closedLabel = "Market Closed", className = "" }) {
  const [isOpen, setIsOpen] = useState(() => stockAPI.getMarketStatus().isOpen);

  useEffect(() => {
    const id = setInterval(() => setIsOpen(stockAPI.getMarketStatus().isOpen), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isOpen
          ? "border-transparent bg-buy text-buy-foreground"
          : "border-sell/30 bg-sell-muted text-sell-muted-foreground"
      } ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy-foreground/60 motion-reduce:animate-none" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isOpen ? "bg-buy-foreground" : "bg-sell"}`} />
      </span>
      {isOpen ? openLabel : closedLabel}
    </span>
  );
}
