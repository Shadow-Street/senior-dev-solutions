import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Subscription, SubscriptionTransaction, User } from "@/api/entities";
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Target, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function SubscriptionAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    newSubscriptions: 0,
    cancelledSubscriptions: 0,
    churnRate: 0,
    retentionRate: 0,
    mrr: 0,
    arr: 0,
    arpu: 0,
    ltv: 0,
    cohortData: [],
    revenueGrowth: 0,
    forecastedMRR: 0,
    planDistribution: [],
    revenueByPlan: [],
    monthlyTrends: [],
    churnReasons: [],
    reactivationRate: 0,
    averageLifespan: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadAnalytics = async () => {
      setIsLoading(true);
      
      try {
        // ✅ Add initial delay to prevent immediate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted || abortController.signal.aborted) return;

        // ✅ Load subscriptions with abort handling
        const allSubscriptions = await Subscription.list(null, 1000).catch((error) => {
          if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
            throw error;
          }
          console.warn('Error loading subscriptions:', error);
          return [];
        });

        if (!isMounted || abortController.signal.aborted) return;

        // ✅ Add delay before next API call (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!isMounted || abortController.signal.aborted) return;

        // ✅ Load transactions with abort handling
        const allTransactions = await SubscriptionTransaction.list(null, 1000).catch((error) => {
          if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
            throw error;
          }
          console.warn('Error loading transactions:', error);
          return [];
        });

        if (!isMounted || abortController.signal.aborted) return;

        // ✅ Calculate enhanced analytics
        const activeCount = allSubscriptions.filter(s => s.status === 'active').length;
        const cancelledCount = allSubscriptions.filter(s => s.status === 'cancelled').length;
        const expiredCount = allSubscriptions.filter(s => s.status === 'expired').length;
        
        const totalSubscribers = activeCount + cancelledCount + expiredCount;
        const churnRate = totalSubscribers > 0 ? ((cancelledCount + expiredCount) / totalSubscribers * 100).toFixed(2) : 0;
        const retentionRate = (100 - churnRate).toFixed(2);

        // Calculate MRR and ARR
        const monthlyRevenue = allSubscriptions
          .filter(s => s.status === 'active')
          .reduce((sum, s) => sum + (s.price || 0), 0);

        const mrr = monthlyRevenue.toFixed(2);
        const arr = (monthlyRevenue * 12).toFixed(2);

        // Calculate ARPU
        const arpu = activeCount > 0 ? (monthlyRevenue / activeCount).toFixed(2) : 0;

        // Calculate LTV
        const churnDecimal = parseFloat(churnRate) / 100;
        const ltv = churnDecimal > 0 ? (parseFloat(arpu) / churnDecimal).toFixed(2) : 0;

        // Calculate revenue growth
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const recentRevenue = allTransactions
          .filter(t => new Date(t.created_date) > last30Days && t.payment_status === 'completed')
          .reduce((sum, t) => sum + (t.net_amount || 0), 0);

        const previousRevenue = allTransactions
          .filter(t => {
            const date = new Date(t.created_date);
            return date > previous30Days && date <= last30Days && t.payment_status === 'completed';
          })
          .reduce((sum, t) => sum + (t.net_amount || 0), 0);

        const revenueGrowth = previousRevenue > 0 
          ? (((recentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2)
          : 0;

        // Forecast MRR
        const forecastedMRR = (parseFloat(mrr) * (1 + parseFloat(revenueGrowth) / 100)).toFixed(2);

        // Calculate cohort data
        const cohortData = calculateCohortAnalysis(allSubscriptions);

        // Plan distribution
        const planCounts = {};
        allSubscriptions
          .filter(s => s.status === 'active')
          .forEach(s => {
            const plan = s.plan_type || 'Unknown';
            planCounts[plan] = (planCounts[plan] || 0) + 1;
          });

        const planDistribution = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

        // Revenue by plan
        const planRevenue = {};
        allSubscriptions
          .filter(s => s.status === 'active')
          .forEach(s => {
            const plan = s.plan_type || 'Unknown';
            planRevenue[plan] = (planRevenue[plan] || 0) + (s.price || 0);
          });

        const revenueByPlan = Object.entries(planRevenue).map(([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(2))
        }));

        // Monthly trends
        const monthlyTrends = calculateMonthlyTrends(allTransactions, 12);

        // Churn reasons
        const churnReasonCounts = {};
        allSubscriptions
          .filter(s => s.cancellation_reason)
          .forEach(s => {
            const reason = s.cancellation_category || s.cancellation_reason || 'Other';
            churnReasonCounts[reason] = (churnReasonCounts[reason] || 0) + 1;
          });

        const churnReasons = Object.entries(churnReasonCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        // Reactivation rate
        const reactivatedCount = allSubscriptions.filter(s => 
          s.cancelAtPeriodEnd === false && s.cancellation_date
        ).length;
        const reactivationRate = cancelledCount > 0 
          ? ((reactivatedCount / cancelledCount) * 100).toFixed(2)
          : 0;

        // Average lifespan
        const lifespans = allSubscriptions
          .filter(s => s.start_date && (s.status === 'cancelled' || s.status === 'expired'))
          .map(s => {
            const start = new Date(s.start_date);
            const end = new Date(s.end_date || s.cancellation_date || new Date());
            return (end - start) / (1000 * 60 * 60 * 24);
          });

        const averageLifespan = lifespans.length > 0
          ? (lifespans.reduce((a, b) => a + b, 0) / lifespans.length).toFixed(0)
          : 0;

        // New subscriptions
        const newSubscriptions = allSubscriptions.filter(s => {
          const createdDate = new Date(s.created_date);
          return createdDate > last30Days;
        }).length;

        // Total revenue
        const totalRevenue = allTransactions
          .filter(t => t.payment_status === 'completed')
          .reduce((sum, t) => sum + (t.net_amount || 0), 0);

        if (isMounted && !abortController.signal.aborted) {
          setAnalytics({
            totalRevenue: totalRevenue.toFixed(2),
            activeSubscriptions: activeCount,
            newSubscriptions,
            cancelledSubscriptions: cancelledCount,
            churnRate: parseFloat(churnRate),
            retentionRate: parseFloat(retentionRate),
            mrr: parseFloat(mrr),
            arr: parseFloat(arr),
            arpu: parseFloat(arpu),
            ltv: parseFloat(ltv),
            cohortData,
            revenueGrowth: parseFloat(revenueGrowth),
            forecastedMRR: parseFloat(forecastedMRR),
            planDistribution,
            revenueByPlan,
            monthlyTrends,
            churnReasons,
            reactivationRate: parseFloat(reactivationRate),
            averageLifespan: parseInt(averageLifespan)
          });
        }

      } catch (error) {
        if (!error?.name === 'AbortError' && !error?.message?.includes('abort') && !abortController.signal.aborted) {
          console.error("Error loading analytics:", error);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const calculateCohortAnalysis = (subscriptions) => {
    const cohorts = {};
    
    subscriptions.forEach(sub => {
      if (!sub.start_date) return;
      
      const startMonth = new Date(sub.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!cohorts[startMonth]) {
        cohorts[startMonth] = {
          month: startMonth,
          total: 0,
          active: 0,
          churned: 0
        };
      }
      
      cohorts[startMonth].total++;
      
      if (sub.status === 'active') {
        cohorts[startMonth].active++;
      } else if (sub.status === 'cancelled' || sub.status === 'expired') {
        cohorts[startMonth].churned++;
      }
    });
    
    return Object.values(cohorts)
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .slice(-12)
      .map(cohort => ({
        ...cohort,
        retentionRate: cohort.total > 0 ? ((cohort.active / cohort.total) * 100).toFixed(1) : 0
      }));
  };

  const calculateMonthlyTrends = (transactions, months) => {
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      const monthRevenue = transactions
        .filter(t => {
          const tDate = new Date(t.created_date);
          return tDate.getMonth() === monthDate.getMonth() &&
                 tDate.getFullYear() === monthDate.getFullYear() &&
                 t.payment_status === 'completed';
        })
        .reduce((sum, t) => sum + (t.net_amount || 0), 0);
      
      trends.push({
        month: monthKey,
        revenue: parseFloat(monthRevenue.toFixed(2)),
        subscriptions: transactions.filter(t => {
          const tDate = new Date(t.created_date);
          return tDate.getMonth() === monthDate.getMonth() &&
                 tDate.getFullYear() === monthDate.getFullYear();
        }).length
      });
    }
    
    return trends;
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MRR (Monthly Recurring Revenue)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">₹{analytics.mrr.toLocaleString()}</div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">ARR: ₹{analytics.arr.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-2">
              {analytics.revenueGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.revenueGrowth}% growth
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{analytics.activeSubscriptions}</div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">New: {analytics.newSubscriptions} this month</p>
            <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">
              {analytics.retentionRate}% retention
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{analytics.churnRate}%</div>
              <AlertTriangle className={`w-8 h-8 ${analytics.churnRate > 10 ? 'text-red-500' : 'text-yellow-500'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Cancelled: {analytics.cancelledSubscriptions}</p>
            <Badge className="mt-2 bg-green-100 text-green-700 text-xs">
              {analytics.reactivationRate}% reactivated
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Customer LTV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">₹{analytics.ltv.toLocaleString()}</div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">ARPU: ₹{analytics.arpu}</p>
            <Badge className="mt-2 bg-purple-100 text-purple-700 text-xs">
              Avg. lifespan: {analytics.averageLifespan} days
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecasting */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast & Trends</CardTitle>
          <p className="text-sm text-gray-600">12-month revenue analysis with MRR projection</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Forecasted Next Month MRR</p>
                <p className="text-2xl font-bold text-blue-600">₹{analytics.forecastedMRR.toLocaleString()}</p>
              </div>
              <Activity className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.monthlyTrends}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Existing charts remain the same */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cohort Retention Analysis</CardTitle>
            <p className="text-sm text-gray-600">User retention by signup cohort</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.cohortData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" fill="#10b981" name="Active" />
                <Bar dataKey="churned" fill="#ef4444" name="Churned" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Churn Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Top Churn Reasons</CardTitle>
            <p className="text-sm text-gray-600">Why customers are cancelling</p>
          </CardHeader>
          <CardContent>
            {analytics.churnReasons.length > 0 ? (
              <div className="space-y-3">
                {analytics.churnReasons.slice(0, 5).map((reason, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{reason.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(reason.value / analytics.churnReasons[0].value) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{reason.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No churn data available</p>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.planDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}