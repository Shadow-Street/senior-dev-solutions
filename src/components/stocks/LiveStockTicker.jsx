
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Play, Pause } from "lucide-react";
import { stockAPI } from "./LiveStockAPI";
import MarketStatusBadge from "./MarketStatusBadge";

// Price formatting follows the quote's own currency; the symbol universe is
// configurable server-side, so it is not always INR.
const formatPrice = (stock) => {
  const value = Number(stock?.current_price || 0);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: stock?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
};

export default function LiveStockTicker({ className = "" }) {
  const [stocks, setStocks] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Live quotes from the backend (Finnhub server-side). No sample fallback:
    // showing invented prices on a trading dashboard is worse than showing none.
    const loadStocks = async () => {
      try {
        const market = await stockAPI.getMarketData();
        if (cancelled) return;

        const live = (market?.stocks || []).filter(
          s => s && Number.isFinite(Number(s.current_price)) && Number(s.current_price) > 0
        );

        if (live.length === 0) {
          setStocks([]);
          setStatus('empty');
          return;
        }
        // Duplicate the array for a seamless scrolling effect
        setStocks([...live, ...live]);
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading ticker stocks:', error);
        setStocks([]);
        setStatus('error');
      }
    };

    loadStocks();
    const refresh = setInterval(loadStocks, 60000);
    return () => { cancelled = true; clearInterval(refresh); };
  }, []);

  const PriceChange = ({ change }) => {
    const isPositive = change >= 0;
    const colorClass = isPositive ? "text-positive" : "text-sell-muted-foreground";
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <span className={`flex items-center text-sm font-semibold tabular-nums ${colorClass}`}>
        <Icon className={`w-4 h-4 mr-1 ${isPositive ? 'text-positive' : 'text-sell'}`} />
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 60s linear infinite;
          }
        `}
      </style>
      <Card className={`w-full overflow-hidden bg-card shadow-sm border border-border ${className}`}>
        <CardContent className="flex items-stretch p-0">
          {/* Label column, pinned while the quotes scroll past it. */}
          <div className="flex shrink-0 items-center gap-2 border-r border-divider px-3 py-3 sm:px-4">
            <Activity className="h-5 w-5 text-protocall-blue" />
            <h3 className="hidden text-sm font-semibold text-foreground sm:block">Live Market</h3>
            <MarketStatusBadge openLabel="Live" />
          </div>

          <div className="relative min-w-0 flex-1">
            {status !== 'ready' && (
              <div className="flex h-full items-center px-4 py-3 text-sm text-muted-foreground">
                {status === 'loading' && 'Loading live market data…'}
                {status === 'empty' && 'No live quotes available right now.'}
                {status === 'error' && (
                  <span className="text-sell-muted-foreground">
                    Live market data is unavailable.
                  </span>
                )}
              </div>
            )}

            <div className={`relative flex h-full overflow-x-hidden ${status === 'ready' ? '' : 'hidden'}`}>
              <div
                className="flex items-center py-3 animate-marquee whitespace-nowrap"
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
              >
                {stocks.map((stock, index) => (
                  <div key={index} className="mx-5 flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{stock.symbol}</span>
                    <span className="text-sm tabular-nums text-subtle">{formatPrice(stock)}</span>
                    <PriceChange change={stock.change_percent} />
                  </div>
                ))}
              </div>
              {/* Soft fade so quotes slide in and out instead of being cut. */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-card to-transparent" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause ticker' : 'Play ticker'}
            className="flex shrink-0 items-center border-l border-divider px-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </CardContent>
      </Card>
    </>
  );
}
