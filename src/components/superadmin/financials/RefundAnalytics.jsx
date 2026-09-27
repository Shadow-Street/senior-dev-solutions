
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';

export default function RefundAnalytics({ refunds, permissions }) {
  const refundStats = useMemo(() => {
    const total = refunds.length;
    const pending = refunds.filter(r => r.status === 'pending').length;
    const processed = refunds.filter(r => r.status === 'processed').length;
    const rejected = refunds.filter(r => r.status === 'rejected').length;
    const failed = refunds.filter(r => r.status === 'failed').length;
    
    const totalAmount = refunds
      .filter(r => r.status === 'processed')
      .reduce((sum, r) => sum + (r.refund_amount || 0), 0);
    
    const avgProcessingTime = refunds
      .filter(r => r.status === 'processed' && r.processed_date)
      .reduce((sum, r, _, arr) => {
        const created = new Date(r.created_date).getTime();
        const processed = new Date(r.processed_date).getTime();
        const days = (processed - created) / (1000 * 60 * 60 * 24);
        return sum + days / arr.length;
      }, 0);

    // Refunds by type
    const byType = refunds.reduce((acc, r) => {
      const type = r.transaction_type || 'unknown';
      if (!acc[type]) acc[type] = { count: 0, amount: 0 };
      acc[type].count++;
      if (r.status === 'processed') {
        acc[type].amount += r.refund_amount || 0;
      }
      return acc;
    }, {});

    // Refunds by reason
    const byReason = refunds.reduce((acc, r) => {
      const reason = r.reason_category || 'other';
      if (!acc[reason]) acc[reason] = 0;
      acc[reason]++;
      return acc;
    }, {});

    // Monthly trend
    const monthlyData = refunds.reduce((acc, r) => {
      const month = format(new Date(r.created_date), 'MMM yyyy');
      if (!acc[month]) acc[month] = { month, count: 0, amount: 0 };
      acc[month].count++;
      if (r.status === 'processed') {
        acc[month].amount += r.refund_amount || 0;
      }
      return acc;
    }, {});

    return {
      total,
      pending,
      processed,
      rejected,
      failed,
      totalAmount,
      avgProcessingTime: Math.round(avgProcessingTime),
      byType: Object.entries(byType).map(([name, data]) => ({ name, ...data })),
      byReason: Object.entries(byReason).map(([name, value]) => ({ name, value })),
      monthlyTrend: Object.values(monthlyData).sort((a, b) => 
        new Date(a.month) - new Date(b.month)
      )
    };
  }, [refunds]);

  const COLORS = {
    subscription: '#3B82F6',
    event_ticket: '#8B5CF6',
    course_enrollment: '#10B981',
    advisor_subscription: '#F59E0B',
    pledge_payment: '#EF4444',
    wallet_topup: '#6B7280'
  };

  const REASON_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

  const getTypeLabel = (type) => {
    const labels = {
      subscription: 'Platform Subscription',
      event_ticket: 'Event Tickets',
      course_enrollment: 'Course Enrollments',
      advisor_subscription: 'Advisor Subscriptions',
      pledge_payment: 'Pledge Payments',
      wallet_topup: 'Wallet Top-ups'
    };
    return labels[type] || type;
  };

  const getReasonLabel = (reason) => {
    const labels = {
      cancelled_service: 'Service Cancelled',
      poor_quality: 'Poor Quality',
      technical_issue: 'Technical Issue',
      not_satisfied: 'Not Satisfied',
      duplicate_payment: 'Duplicate Payment',
      fraudulent: 'Fraudulent',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-surface-2 to-sell-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-hold-muted-foreground font-medium">Total Refunds</p>
                <p className="text-3xl font-bold text-hold-muted-foreground mt-1">{refundStats.total}</p>
                <p className="text-xs text-hold-muted-foreground mt-1">All time</p>
              </div>
              <RotateCcw className="w-10 h-10 text-hold-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-surface-2 to-hold-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-hold-muted-foreground font-medium">Pending</p>
                <p className="text-3xl font-bold text-hold-muted-foreground mt-1">{refundStats.pending}</p>
                <p className="text-xs text-hold-muted-foreground mt-1">Awaiting action</p>
              </div>
              <Clock className="w-10 h-10 text-hold-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-surface-2 to-buy-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-buy-muted-foreground font-medium">Processed</p>
                <p className="text-3xl font-bold text-buy-muted-foreground mt-1">{refundStats.processed}</p>
                <p className="text-xs text-buy-muted-foreground mt-1">Successfully refunded</p>
              </div>
              <CheckCircle className="w-10 h-10 text-buy-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-protocall-premium-text font-medium">Total Refunded</p>
                <p className="text-2xl font-bold text-protocall-premium-text mt-1">₹{refundStats.totalAmount.toLocaleString()}</p>
                <p className="text-xs text-protocall-premium-text mt-1">Avg: {refundStats.avgProcessingTime} days</p>
              </div>
              <TrendingDown className="w-10 h-10 text-protocall-premium-text opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Refunds by Transaction Type */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-hold-muted-foreground" />
              Refunds by Transaction Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={refundStats.byType}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, count }) => `${getTypeLabel(name).split(' ')[0]}: ${count}`}
                >
                  {refundStats.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.wallet_topup} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [
                  `${value} refunds (₹${props.payload.amount.toLocaleString()})`,
                  getTypeLabel(props.payload.name)
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Refunds by Reason */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-protocall-blue" />
              Refund Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={refundStats.byReason}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickFormatter={getReasonLabel} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value, name, props) => [value, getReasonLabel(props.payload.name)]} />
                <Bar dataKey="value" name="Count">
                  {refundStats.byReason.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={REASON_COLORS[index % REASON_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Refund Trend */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-protocall-premium-text" />
            Monthly Refund Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={refundStats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="hsl(var(--chart-5))" strokeWidth={3} name="Refund Count" />
              <Line yAxisId="right" type="monotone" dataKey="amount" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Refund Amount (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Refunds Table */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-protocall-blue" />
            Recent Refund Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {refunds.slice(0, 10).map((refund) => (
                  <tr key={refund.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 text-sm text-subtle">
                      {format(new Date(refund.created_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {refund.user_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-subtle">
                      {getTypeLabel(refund.transaction_type)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      ₹{refund.refund_amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        refund.status === 'processed' ? 'bg-buy-muted text-buy-muted-foreground' :
                        refund.status === 'pending' ? 'bg-hold-muted text-hold-muted-foreground' :
                        refund.status === 'rejected' ? 'bg-sell-muted text-sell-muted-foreground' :
                        'bg-surface-2 text-foreground'
                      }>
                        {refund.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-subtle">
                      {getReasonLabel(refund.reason_category)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
