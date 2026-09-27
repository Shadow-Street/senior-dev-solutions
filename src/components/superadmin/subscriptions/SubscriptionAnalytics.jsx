import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, AlertCircle } from "lucide-react";

export default function AdminSubscriptionManager() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await apiClient.get('/admin/subscriptions/analytics');
      setStats(data);
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8 p-8 bg-surface-2/50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent w-fit">Subscription Management</h2>
        <p className="text-muted-foreground font-medium">Overview of your revenue, subscribers, and coupon performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-protocall-deep to-protocall-blue text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Loader2 className="w-24 h-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-protocall-blue uppercase tracking-wider">Total Revenue (ARR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats?.financials?.arr?.toLocaleString()}</div>
            <p className="text-xs text-protocall-premium-light mt-1">Projected Annual Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="border border-protocall-premium-light shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-subtle uppercase tracking-wider">Active Users</CardTitle>
            <Badge className="bg-buy-muted text-buy-muted-foreground hover:bg-buy-muted">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.subscribers?.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently subscribed members</p>
          </CardContent>
        </Card>

        <Card className="border border-sell/30 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-subtle uppercase tracking-wider">Churn Rate</CardTitle>
            <AlertCircle className="w-5 h-5 text-sell" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sell-muted-foreground">{stats?.subscribers?.churnRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Cancellation rate this month</p>
          </CardContent>
        </Card>

        <Card className="border border-protocall-premium-light shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-subtle uppercase tracking-wider">Failed Payments</CardTitle>
            <Badge variant="destructive">{stats?.issues?.failedPayments || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats?.issues?.failedPayments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Transactions affecting revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-surface-2 border-b border-divider">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="p-2 bg-hold-muted rounded-lg text-hold-muted-foreground"><Loader2 className="w-5 h-5" /></span>
            Top Performing Coupons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-surface-2 border-divider">
                <TableHead className="py-4 pl-6 font-semibold text-subtle">Coupon Code</TableHead>
                <TableHead className="py-4 font-semibold text-subtle">Usage Count</TableHead>
                <TableHead className="text-right py-4 pr-6 font-semibold text-subtle">Revenue Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.charts?.coupons?.map((coupon, index) => (
                <TableRow key={coupon.coupon_used} className="hover:bg-surface-2/50 transition-colors border-divider">
                  <TableCell className="font-semibold text-protocall-blue pl-6 border-l-4 border-l-transparent hover:border-l-indigo-500 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-premium-muted text-protocall-blue text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      {coupon.coupon_used}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="secondary" className="bg-surface-2 text-subtle">
                      {coupon.usage_count} uses
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground pr-6 py-4">
                    ₹{parseFloat(coupon.total_revenue).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!stats?.charts?.coupons || stats.charts.coupons.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No coupon usage data available yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}