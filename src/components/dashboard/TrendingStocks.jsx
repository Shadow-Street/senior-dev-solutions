import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function TrendingStocks({ stocks = [] }) {
  const navigate = useNavigate();
  // We can add watchlist logic here if needed

  const handleWatch = (stock) => {
    toast.info("Watchlist feature coming soon!");
  };

  const handleDiscuss = (stock) => {
    navigate(createPageUrl(`ChatRooms`));
    toast.success(`Opening chat rooms for ${stock.symbol} discussions...`);
  };

  // If no stocks, show a placeholder or loading state could be handled by parent
  // But let's show an empty state if truly empty
  if (!stocks || stocks.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Trending Stocks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-slate-500">
          No trending data available right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Trending Stocks
          </CardTitle>
          <Badge variant="outline" className="animate-pulse bg-green-50 text-green-700 border-green-200">
            ● Live Market
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.slice(0, 6).map((stock, index) => (
            <div key={stock.symbol || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{stock.symbol}</h4>
                  <p className="text-sm text-gray-600">{stock.name || stock.company_name || stock.symbol}</p>
                </div>
                {/* Sector is often missing in simple live feeds, display if available */}
                {stock.sector && <Badge variant="outline" className="text-xs">{stock.sector}</Badge>}
              </div>

              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900">₹{parseFloat(stock.current_price || 0).toFixed(2)}</div>
                <div className="flex items-center gap-1">
                  {parseFloat(stock.change_percent) >= 0 ? (
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                      +{parseFloat(stock.change_percent || 0).toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                      {parseFloat(stock.change_percent || 0).toFixed(2)}%
                    </span>
                  )}
                  {parseFloat(stock.change_percent) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  onClick={() => handleWatch(stock)}
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                >
                  <Star className="w-3 h-3 mr-1" /> Watch
                </Button>
                <Button
                  onClick={() => handleDiscuss(stock)}
                  variant="outline"
                  className="flex-1 h-8 text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                >
                  <MessageSquare className="w-3 h-3 mr-1" /> Chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}