import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Activity, Target, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function PMOverview({ pmProfile }) {
  const [stats, setStats] = useState({
    totalAUM: 0,
    totalClients: 0,
    totalRevenue: 0,
    avgReturn: 0,
    activeStrategies: 0,
    pendingOrders: 0
  });
  const [aumTrend, setAumTrend] = useState([]);
  const [strategyDistribution, setStrategyDistribution] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, [pmProfile]);

  const loadOverviewData = async () => {
    try {
      const [clients, strategies, invoices, orders] = await Promise.all([
        base44.entities.PMClient.filter({ pm_id: pmProfile.id, status: 'active' }),
        base44.entities.PMStrategy.filter({ pm_id: pmProfile.id }),
        base44.entities.PMInvoice.filter({ pm_id: pmProfile.id, status: 'paid' }),
        base44.entities.PMTradeOrder.filter({ pm_id: pmProfile.id, status: 'pending' })
      ]);

      const totalAUM = clients.reduce((sum, c) => sum + (c.current_value || 0), 0);
      const totalRevenue = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const avgReturn = clients.length > 0 
        ? clients.reduce((sum, c) => sum + ((c.unrealized_pnl / c.invested_amount) * 100 || 0), 0) / clients.length 
        : 0;

      setStats({
        totalAUM,
        totalClients: clients.length,
        totalRevenue,
        avgReturn: avgReturn.toFixed(2),
        activeStrategies: strategies.filter(s => s.is_active).length,
        pendingOrders: orders.length
      });

      // Strategy distribution
      const strategyDist = strategies.map(s => ({
        name: s.strategy_name,
        value: s.total_aum || 0
      }));
      setStrategyDistribution(strategyDist);

      // Mock AUM trend data (in production, fetch from PMNAVSnapshot)
      const mockTrend = [
        { month: 'Jan', aum: totalAUM * 0.7 },
        { month: 'Feb', aum: totalAUM * 0.75 },
        { month: 'Mar', aum: totalAUM * 0.82 },
        { month: 'Apr', aum: totalAUM * 0.88 },
        { month: 'May', aum: totalAUM * 0.95 },
        { month: 'Jun', aum: totalAUM }
      ];
      setAumTrend(mockTrend);

    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total AUM</p>
                <p className="text-3xl font-bold mt-2">₹{(stats.totalAUM / 100000).toFixed(2)}L</p>
                <p className="text-blue-100 text-xs mt-1">{stats.totalClients} Active Clients</p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-green-100 text-xs mt-1">From Performance Fees</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Avg Return</p>
                <p className="text-3xl font-bold mt-2">{stats.avgReturn}%</p>
                <p className="text-purple-100 text-xs mt-1">{stats.activeStrategies} Active Strategies</p>
              </div>
              <Target className="w-12 h-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              AUM Growth Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={aumTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(2)}L`} />
                <Line type="monotone" dataKey="aum" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Strategy Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={strategyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {strategyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${(value / 100000).toFixed(2)}L`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-900">{stats.totalClients}</p>
              <p className="text-sm text-blue-600">Active Clients</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <Target className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-900">{stats.activeStrategies}</p>
              <p className="text-sm text-green-600">Active Strategies</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600 mb-2" />
              <p className="text-2xl font-bold text-orange-900">{stats.pendingOrders}</p>
              <p className="text-sm text-orange-600">Pending Orders</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-900">{pmProfile.performance_fee_percentage}%</p>
              <p className="text-sm text-purple-600">Performance Fee</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}