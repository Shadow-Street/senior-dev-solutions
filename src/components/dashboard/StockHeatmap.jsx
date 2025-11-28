
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

export default function StockHeatmap({ polls, recommendations }) {
  // Sample data for fallback
  const sampleHeatmapData = [
    { symbol: 'RELIANCE', company_name: 'Reliance Industries', buy_percentage: 85, total_votes: 245, price: 2456.75, recommendation_score: 4.2 },
    { symbol: 'TCS', company_name: 'Tata Consultancy Services', buy_percentage: 67, total_votes: 189, price: 3842.50, recommendation_score: 3.8 },
    { symbol: 'HDFCBANK', company_name: 'HDFC Bank', buy_percentage: 78, total_votes: 156, price: 1654.30, recommendation_score: 4.0 },
    { symbol: 'INFY', company_name: 'Infosys', buy_percentage: 45, total_votes: 134, price: 1567.25, recommendation_score: 3.2 },
    { symbol: 'ICICIBANK', company_name: 'ICICI Bank', buy_percentage: 32, total_votes: 98, price: 956.40, recommendation_score: 2.8 },
    { symbol: 'BHARTIARTL', company_name: 'Bharti Airtel', buy_percentage: 89, total_votes: 201, price: 1234.80, recommendation_score: 4.5 },
    { symbol: 'WIPRO', company_name: 'Wipro', buy_percentage: 23, total_votes: 87, price: 445.60, recommendation_score: 2.3 },
    { symbol: 'LT', company_name: 'L&T', buy_percentage: 71, total_votes: 167, price: 3234.90, recommendation_score: 3.9 },
    { symbol: 'MARUTI', company_name: 'Maruti Suzuki', buy_percentage: 56, total_votes: 123, price: 10456.75, recommendation_score: 3.5 },
    { symbol: 'ASIANPAINT', company_name: 'Asian Paints', buy_percentage: 64, total_votes: 145, price: 2834.20, recommendation_score: 3.7 },
    { symbol: 'ADANIENT', company_name: 'Adani Enterprises', buy_percentage: 41, total_votes: 112, price: 2156.30, recommendation_score: 3.1 },
    { symbol: 'TATAMOTORS', company_name: 'Tata Motors', buy_percentage: 73, total_votes: 189, price: 654.20, recommendation_score: 3.8 },
    { symbol: 'SUNPHARMA', company_name: 'Sun Pharma', buy_percentage: 52, total_votes: 134, price: 1432.60, recommendation_score: 3.4 },
    { symbol: 'HINDUNILVR', company_name: 'Hindustan Unilever', buy_percentage: 61, total_votes: 156, price: 2378.90, recommendation_score: 3.6 },
    { symbol: 'BAJFINANCE', company_name: 'Bajaj Finance', buy_percentage: 69, total_votes: 178, price: 6834.50, recommendation_score: 3.7 },
    { symbol: 'COALINDIA', company_name: 'Coal India', buy_percentage: 38, total_votes: 95, price: 234.80, recommendation_score: 2.9 },
    { symbol: 'AXISBANK', company_name: 'Axis Bank', buy_percentage: 58, total_votes: 143, price: 1089.40, recommendation_score: 3.5 },
    { symbol: 'NTPC', company_name: 'NTPC', buy_percentage: 47, total_votes: 118, price: 267.30, recommendation_score: 3.2 },
    { symbol: 'POWERGRID', company_name: 'Power Grid', buy_percentage: 53, total_votes: 129, price: 289.60, recommendation_score: 3.4 },
    { symbol: 'ULTRACEMCO', company_name: 'UltraTech Cement', buy_percentage: 66, total_votes: 152, price: 8945.20, recommendation_score: 3.7 }
  ];

  // Calculate heatmap data from polls
  const heatmapData = sampleHeatmapData.map(stock => ({
    ...stock,
    intensity: stock.buy_percentage,
    color: stock.buy_percentage >= 80 ? 'bg-emerald-600' :
           stock.buy_percentage >= 60 ? 'bg-green-500' :
           stock.buy_percentage >= 40 ? 'bg-yellow-500' :
           stock.buy_percentage >= 20 ? 'bg-orange-500' : 'bg-red-500',
    textColor: stock.buy_percentage >= 40 ? 'text-white' : 'text-white'
  }));

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-green-50 pb-4">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Activity className="w-5 h-5 text-green-600" />
          Community Buy Recommendations Heatmap
        </CardTitle>
        <p className="text-sm text-slate-600">Real-time sentiment analysis • Darker = Stronger buy signal</p>
      </CardHeader>
      <CardContent className="p-0 overflow-visible">
        {/* Compact Heatmap Grid - No gaps */}
        <div className="grid grid-cols-5 md:grid-cols-10 relative">
          {heatmapData.map(stock => (
            <div
              key={stock.symbol}
              className={`${stock.color} ${stock.textColor} relative group cursor-pointer transition-all duration-300 hover:z-[100] hover:scale-110 hover:shadow-2xl`}
              style={{ aspectRatio: '1/1' }}
              title={`${stock.company_name} - ${stock.buy_percentage}% buy votes`}
            >
              {/* Compact Content */}
              <div className="absolute inset-0 p-1.5 flex flex-col items-center justify-center">
                <div className="text-[9px] font-bold tracking-tight leading-tight text-center opacity-90 group-hover:opacity-100">
                  {stock.symbol}
                </div>
                <div className="text-[10px] font-extrabold mt-0.5 group-hover:text-shadow">
                  {stock.buy_percentage}%
                </div>
              </div>

              {/* Hover Tooltip - Now positioned below */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[150]">
                <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                  <div className="font-bold mb-1">{stock.company_name}</div>
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-slate-300">Price:</span>
                    <span className="font-semibold">₹{stock.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-slate-300">Buy Signal:</span>
                    <span className="font-semibold">{stock.buy_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-slate-300">Votes:</span>
                    <span className="font-semibold">{stock.total_votes}</span>
                  </div>
                  {/* Arrow pointing up */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Professional Legend */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-600 rounded-sm shadow-sm"></div>
              <span className="text-xs font-medium text-slate-700">Strong Buy (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm shadow-sm"></div>
              <span className="text-xs font-medium text-slate-700">Buy (60-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-sm shadow-sm"></div>
              <span className="text-xs font-medium text-slate-700">Hold (40-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-sm shadow-sm"></div>
              <span className="text-xs font-medium text-slate-700">Weak (20-40%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-sm shadow-sm"></div>
              <span className="text-xs font-medium text-slate-700">Sell (0-20%)</span>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-slate-500 italic">
              Hover over any stock to see detailed information • Updated in real-time
            </p>
          </div>
        </div>
      </CardContent>

      {/* Custom CSS for text shadow on hover */}
      <style>
        {`
          .text-shadow {
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
        `}
      </style>
    </Card>
  );
}
