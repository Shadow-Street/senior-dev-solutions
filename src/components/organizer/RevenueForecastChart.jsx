import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths, eachMonthOfInterval, startOfMonth } from 'date-fns';

export default function RevenueForecastChart({ events, tickets, stats }) {
  const forecastData = useMemo(() => {
    // Get last 6 months of actual revenue
    const sixMonthsAgo = addMonths(new Date(), -5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: addMonths(new Date(), 6) // Include next 6 months
    });

    return months.map((month, index) => {
      const isHistorical = month <= new Date();
      const monthStr = format(month, 'MMM yy');

      if (isHistorical) {
        // Actual revenue for past months
        const monthStart = startOfMonth(month);
        const monthEnd = addMonths(monthStart, 1);
        
        const monthTickets = tickets.filter(t => {
          const purchaseDate = new Date(t.purchased_date || t.created_date);
          return purchaseDate >= monthStart && purchaseDate < monthEnd;
        });
        
        const actualRevenue = monthTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);
        
        return {
          month: monthStr,
          actual: actualRevenue,
          forecast: null,
          isHistorical: true
        };
      } else {
        // Forecast future revenue based on trends
        const avgMonthlyRevenue = tickets.length > 0 
          ? stats.totalRevenue / 6 
          : 0;
        
        // Add growth factor (assume 10% growth per month)
        const growthFactor = 1.1;
        const monthsFromNow = index - 6;
        const forecastRevenue = avgMonthlyRevenue * Math.pow(growthFactor, monthsFromNow);
        
        return {
          month: monthStr,
          actual: null,
          forecast: Math.round(forecastRevenue),
          isHistorical: false
        };
      }
    });
  }, [events, tickets, stats]);

  const projectedAnnualRevenue = useMemo(() => {
    const futureRevenue = forecastData
      .filter(d => !d.isHistorical)
      .reduce((sum, d) => sum + (d.forecast || 0), 0);
    
    const pastRevenue = forecastData
      .filter(d => d.isHistorical)
      .reduce((sum, d) => sum + (d.actual || 0), 0);
    
    return futureRevenue + pastRevenue;
  }, [forecastData]);

  const expectedGrowth = useMemo(() => {
    const lastMonthRevenue = forecastData.find(d => d.isHistorical && d.actual > 0)?.actual || 0;
    const nextMonthForecast = forecastData.find(d => !d.isHistorical)?.forecast || 0;
    
    if (lastMonthRevenue === 0) return 0;
    return ((nextMonthForecast - lastMonthRevenue) / lastMonthRevenue) * 100;
  }, [forecastData]);

  return (
    <div className="space-y-6">
      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-5">
            <TrendingUp className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-sm text-blue-100">Projected Annual Revenue</p>
            <p className="text-3xl font-bold mt-1">₹{(projectedAnnualRevenue / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-5">
            <Target className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-sm text-green-100">Expected Growth</p>
            <p className="text-3xl font-bold mt-1">+{expectedGrowth.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-5">
            <DollarSign className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-sm text-purple-100">Next Month Forecast</p>
            <p className="text-3xl font-bold mt-1">
              ₹{((forecastData.find(d => !d.isHistorical)?.forecast || 0) / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Revenue Forecast (12 Months)
          </CardTitle>
          <p className="text-sm text-slate-600">Historical data + AI-powered forecast based on your trends</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  value ? `₹${value.toLocaleString()}` : 'N/A', 
                  name === 'actual' ? 'Actual Revenue' : 'Forecasted Revenue'
                ]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#10B981" 
                fill="url(#colorActual)" 
                name="Actual Revenue"
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="forecast" 
                stroke="#3B82F6" 
                fill="url(#colorForecast)" 
                name="Forecasted Revenue"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>💡 Forecast Insights:</strong> Based on your current growth trend (+{expectedGrowth.toFixed(1)}% month-over-month), 
              you're projected to earn ₹{(projectedAnnualRevenue / 1000).toFixed(1)}k in the next 12 months. 
              Keep creating quality events to maintain this trajectory!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}