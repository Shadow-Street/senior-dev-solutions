
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Megaphone, Receipt, BarChart3, Gift, Crown, Activity, RotateCcw } from 'lucide-react'; // Added RotateCcw icon
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

export default function Overview({ data, subscriptionTransactions, refunds }) { // ADDED: refunds prop
  const { stats, revenueTrend, expenseBreakdown } = data;

  // Extract subscriptionRevenue calculation for direct use and memoization
  const subscriptionRevenue = useMemo(() =>
    subscriptionTransactions.reduce((acc, tx) => acc + tx.net_amount, 0),
    [subscriptionTransactions]
  );

  const refundStats = useMemo(() => {
    if (!refunds) return { total: 0, processed: 0, amount: 0 };
    return {
      total: refunds.length,
      processed: refunds.filter(r => r.status === 'processed').length,
      amount: refunds.filter(r => r.status === 'processed').reduce((sum, r) => sum + (r.refund_amount || 0), 0)
    };
  }, [refunds]);

  const revenueBySource = useMemo(() => {
    // Use the pre-calculated adRevenue from the stats object
    const adRevenue = stats.adRevenue || 0;
    
    // Calculate other revenue by subtracting known sources from total net revenue
    const otherRevenue = stats.netRevenue - subscriptionRevenue - adRevenue;

    return [
      { name: 'Subscriptions', value: Math.round(subscriptionRevenue) },
      { name: 'Ad Revenue', value: Math.round(adRevenue) },
      { name: 'Other', value: Math.round(otherRevenue > 0 ? otherRevenue : 0) }
    ];
  }, [subscriptionRevenue, stats.netRevenue, stats.adRevenue]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  // Helper component for KPI cards - moved and refactored
  const StatCard = ({ title, value, icon: Icon, subtitle, change, badge, gradient }) => (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white">
      <CardContent className="p-0">
        {/* Enhanced gradient header with glass effect */}
        <div className={`bg-gradient-to-br ${gradient} p-6 relative overflow-hidden`}>
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Enhanced icon with glow effect */}
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/30">
                <Icon className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium tracking-wide">{title}</p>
                <p className="text-white text-3xl font-bold mt-1 drop-shadow-lg">{value}</p>
                {subtitle && (
                  <p className="text-white/80 text-xs mt-1 font-medium">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced footer with better styling */}
        <div className="p-5 bg-gradient-to-br from-surface-2 to-white">
          {change && (
            <div className="flex items-center gap-2 text-sm">
              {/* Assuming 'change' always implies an upward trend for display, or a generic icon */}
              <div className="p-1.5 bg-buy-muted rounded-lg">
                <TrendingUp className="w-4 h-4 text-buy-muted-foreground" /> 
              </div>
              <span className="text-subtle font-medium">{change}</span>
            </div>
          )}
          {badge && (
            <div className="mt-3">
              <span className={`px-4 py-1.5 text-xs rounded-full font-semibold shadow-sm ${
                badge.status === 'Excellent' ? 'bg-gradient-to-r from-surface-2 to-buy-muted text-buy-muted-foreground border border-buy/30' :
                badge.status === 'Good' ? 'bg-gradient-to-r from-surface-2 to-hold-muted text-hold-muted-foreground border border-hold/30' :
                'bg-gradient-to-r from-surface-2 to-sell-muted text-sell-muted-foreground border border-sell/30'
              }`}>
                {badge.status}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6"> {/* Changed space-y-8 to space-y-6 */}
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary font-medium">Gross Revenue</p>
                <p className="text-3xl font-bold text-primary">₹{(data.stats.grossRevenue / 1000).toFixed(1)}k</p>
              </div>
              <TrendingUp className="w-10 h-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-surface-2 to-buy-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-buy-muted-foreground font-medium">Net Revenue</p>
                <p className="text-3xl font-bold text-buy-muted-foreground">₹{(data.stats.netRevenue / 1000).toFixed(1)}k</p>
                <p className="text-xs text-buy-muted-foreground mt-1">After discounts & refunds</p>
              </div>
              <DollarSign className="w-10 h-10 text-buy-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-surface-2 to-hold-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-hold-muted-foreground font-medium">Total Refunded</p>
                <p className="text-3xl font-bold text-hold-muted-foreground">₹{(refundStats.amount / 1000).toFixed(1)}k</p>
                <p className="text-xs text-hold-muted-foreground mt-1">{refundStats.processed} processed</p>
              </div>
              <RotateCcw className="w-10 h-10 text-hold-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-protocall-premium-text font-medium">Net Profit</p>
                <p className="text-3xl font-bold text-protocall-premium-text">₹{(data.stats.netProfit / 1000).toFixed(1)}k</p>
                <p className="text-xs text-protocall-premium-text mt-1">After all deductions</p>
              </div>
              <BarChart3 className="w-10 h-10 text-protocall-premium-text opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Secondary KPI Cards - Additional Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Additional Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Discounts" 
            value={`₹${(stats.totalDiscounts / 1000).toFixed(1)}k`} 
            subtitle="Promotional value"
            icon={Gift} 
            change="Customer savings"
            gradient="from-protocall-deep via-sell to-protocall-blue"
          />
          <StatCard 
            title="Ad Revenue" 
            value={`₹${(stats.adRevenue / 1000).toFixed(1)}k`} 
            subtitle="From campaigns"
            icon={Megaphone} // Changed from TrendingUp to Megaphone as per original intent for ad revenue
            change="Advertising income"
            gradient="from-buy via-protocall-grape to-buy-soft"
          />
          <StatCard 
            title="Subscription Revenue" 
            value={`₹${(subscriptionRevenue / 1000).toFixed(1)}k`} 
            subtitle="Platform plans"
            icon={Crown} 
            change={`${subscriptionTransactions.length} transactions`}
            gradient="from-protocall-deep via-protocall-grape to-protocall-blue"
          />
          <StatCard 
            title="Platform Health" 
            value={
              stats.totalExpenses > 0
                ? `${((stats.netProfit / stats.totalExpenses) * 100).toFixed(0)}%`
                : 'N/A'
            } 
            subtitle="Profit vs Expenses"
            icon={Activity} 
            badge={{ 
              status: stats.netProfit > stats.totalExpenses 
                ? 'Excellent' 
                : stats.netProfit > (stats.totalExpenses * 0.5) 
                  ? 'Good' 
                  : 'Needs Attention' 
            }}
            gradient="from-protocall-deep via-protocall-grape to-protocall-blue"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle>Monthly Performance (Net Revenue vs. Expenses)</CardTitle>
            <CardDescription>Track your monthly profit over the last year.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `₹${value / 1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => `₹${value.toLocaleString()}`}
                  labelStyle={{ fontWeight: 'bold' }}
                  itemStyle={{ textTransform: 'capitalize' }}
                />
                <Legend />
                <Bar dataKey="netRevenue" name="Net Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle>Revenue Sources</CardTitle>
            <CardDescription>Breakdown of platform income streams.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
