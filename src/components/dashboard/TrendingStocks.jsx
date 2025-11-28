import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function TrendingStocks({ stocks }) {
  const navigate = useNavigate();
  const [watchingStocks, setWatchingStocks] = useState(new Set());

  // Fallback sample data - NO DATABASE CALLS
  const sampleStocks = [
    { id: '1', symbol: 'BHARTIARTL', company_name: 'Bharti Airtel', current_price: 1234.80, change_percent: 3.46, sector: 'Telecom' },
    { id: '2', symbol: 'SBIN', company_name: 'State Bank of India', current_price: 542.30, change_percent: 2.57, sector: 'Banking' },
    { id: '3', symbol: 'RELIANCE', company_name: 'Reliance Industries', current_price: 2456.75, change_percent: 2.43, sector: 'Energy' },
    { id: '4', symbol: 'MARUTI', company_name: 'Maruti Suzuki India', current_price: 10456.75, change_percent: 2.17, sector: 'Automobile' },
    { id: '5', symbol: 'HDFCBANK', company_name: 'HDFC Bank', current_price: 1654.30, change_percent: 1.78, sector: 'Banking' },
  ];

  const stockData = stocks.length > 0 ? stocks.slice(0, 6) : sampleStocks;

  const handleWatch = (stock) => {
    toast.info("Feature demo - watchlist requires login");
  };

  const handleDiscuss = (stock) => {
    navigate(createPageUrl(`ChatRooms`));
    toast.success(`Opening chat rooms for ${stock.symbol} discussions...`);
  };

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Trending Stocks
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stockData.map(stock => (
            <div key={stock.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{stock.symbol}</h4>
                  <p className="text-sm text-gray-600">{stock.company_name}</p>
                </div>
                <Badge variant="outline" className="text-xs">{stock.sector}</Badge>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900">₹{stock.current_price?.toFixed(2)}</div>
                <div className="flex items-center gap-1">
                  {stock.change_percent >= 0 ? (
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      +{stock.change_percent?.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                      {stock.change_percent?.toFixed(2)}%
                    </span>
                  )}
                  {stock.change_percent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleWatch(stock)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
                >
                  <Star className="w-4 h-4" />
                  Watch
                </Button>
                <Button
                  onClick={() => handleDiscuss(stock)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  Discuss
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}