
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stockAPI } from "../stocks/LiveStockAPI";

export default function LiveStockTicker({ stockSymbol, onPriceUpdate }) {
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadStockData = useCallback(async () => {
    if (!stockSymbol) return;
    
    try {
      const data = await stockAPI.getStockPrice(stockSymbol);
      setStockData(data);
      setLastUpdate(new Date());
      onPriceUpdate && onPriceUpdate(data);
    } catch (error) {
      console.error("Error loading stock data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [stockSymbol, onPriceUpdate]);

  useEffect(() => {
    if (!stockSymbol) return;

    loadStockData();
    
    // Subscribe to real-time updates
    const unsubscribe = stockAPI.subscribe(stockSymbol, (updatedStock) => {
      setStockData(updatedStock);
      setLastUpdate(new Date());
      onPriceUpdate && onPriceUpdate(updatedStock);
    });

    // Refresh every 30 seconds
    const interval = setInterval(loadStockData, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [stockSymbol, onPriceUpdate, loadStockData]);

  const getPriceColor = (changePercent) => {
    if (changePercent > 0) return "text-buy-muted-foreground bg-buy-muted border-buy/30";
    if (changePercent < 0) return "text-sell-muted-foreground bg-sell-muted border-sell/30";
    return "text-hold-muted-foreground bg-hold-muted border-hold/30";
  };

  const getPriceIcon = (changePercent) => {
    if (changePercent > 0) return <TrendingUp className="w-4 h-4" />;
    if (changePercent < 0) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card className="bg-surface-2 border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-protocall-blue" />
            <span className="ml-2 text-sm text-subtle">Loading {stockSymbol} price...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stockData) {
    return (
      <Card className="bg-gradient-to-r from-surface-2 to-hold-muted border-0">
        <CardContent className="p-4">
          <div className="text-center text-sm text-subtle">
            Unable to load price data for {stockSymbol}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 ${getPriceColor(stockData.change_percent).replace('text-', 'from-').replace('bg-', 'to-')} bg-gradient-to-r`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{stockSymbol}</h2>
                {stockData.isFallback && (
                  <Badge variant="outline" className="bg-hold-muted text-hold-muted-foreground border-hold/30" title="Live data limit reached. Showing simulated price.">
                    Simulated
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-subtle">
                <span>NSE</span>
                <span>•</span>
                <span>{lastUpdate?.toLocaleTimeString()}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                ₹{stockData.current_price?.toFixed(2)}
              </div>
              <Badge 
                variant="outline" 
                className={`${getPriceColor(stockData.change_percent)} border`}
              >
                {getPriceIcon(stockData.change_percent)}
                <span className="ml-1">
                  {stockData.change_percent >= 0 ? '+' : ''}
                  {stockData.change_percent?.toFixed(2)}%
                </span>
                <span className="ml-2">
                  ({stockData.change_percent >= 0 ? '+' : ''}₹{stockData.change_amount?.toFixed(2)})
                </span>
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">High</div>
              <div className="font-semibold">₹{stockData.day_high?.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Low</div>
              <div className="font-semibold">₹{stockData.day_low?.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Volume</div>
              <div className="font-semibold">{(stockData.volume / 1000).toFixed(0)}K</div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={loadStockData}
            className="flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
