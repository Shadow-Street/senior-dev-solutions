
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Play, Pause } from "lucide-react";
import { stockAPI } from "./LiveStockAPI";

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
  const [marketOpen, setMarketOpen] = useState(() => stockAPI.getMarketStatus().isOpen);

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
    setMarketOpen(stockAPI.getMarketStatus().isOpen);
    const refresh = setInterval(loadStocks, 60000);
    return () => { cancelled = true; clearInterval(refresh); };
  }, []);

  const PriceChange = ({ change }) => {
    const isPositive = change >= 0;
    const colorClass = isPositive ? "text-positive" : "text-sell-muted-foreground";
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <span className={`flex items-center text-sm font-medium ${colorClass}`}>
        <Icon className="w-4 h-4 mr-1" />
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
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-divider">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-protocall-blue" />
              <h3 className="text-sm font-semibold text-foreground">Live Market</h3>
              <Badge
                variant="outline"
                className={marketOpen
                  ? 'bg-buy text-buy-foreground border-transparent'
                  : 'bg-surface-2 text-subtle border-border'}
              >
                {marketOpen ? 'Market Open' : 'Market Closed'}
              </Badge>
            </div>
            <button onClick={() => setIsPlaying(!isPlaying)} className="text-muted-foreground hover:text-foreground">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
          {status !== 'ready' && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {status === 'loading' && 'Loading live market data…'}
              {status === 'empty' && 'No live quotes available right now.'}
              {status === 'error' && (
                <span className="text-sell-muted-foreground">
                  Live market data is unavailable.
                </span>
              )}
            </div>
          )}

          <div className={`relative flex overflow-x-hidden ${status === 'ready' ? '' : 'hidden'}`}>
            <div 
              className="py-3 flex animate-marquee whitespace-nowrap"
              style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
            >
              {stocks.map((stock, index) => (
                <div key={index} className="flex items-center mx-4 flex-shrink-0">
                  <span className="font-semibold text-foreground text-sm">{stock.symbol}</span>
                  <span className="ml-2 text-subtle text-sm">{formatPrice(stock)}</span>
                  <span className="ml-2"><PriceChange change={stock.change_percent} /></span>
                  <span className="text-muted-foreground/50 mx-4">*</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
