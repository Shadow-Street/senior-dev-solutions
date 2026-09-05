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
    <div className="space-y-8 p-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent w-fit">Subscription Management</h2>
        <p className="text-gray-500 font-medium">Overview of your revenue, subscribers, and coupon performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Loader2 className="w-24 h-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-100 uppercase tracking-wider">Total Revenue (ARR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats?.financials?.arr?.toLocaleString()}</div>
            <p className="text-xs text-indigo-200 mt-1">Projected Annual Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Active Users</CardTitle>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.subscribers?.active}</div>
            <p className="text-xs text-gray-400 mt-1">Currently subscribed members</p>
          </CardContent>
        </Card>

        <Card className="border border-red-100 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Churn Rate</CardTitle>
            <AlertCircle className="w-5 h-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats?.subscribers?.churnRate}%</div>
            <p className="text-xs text-gray-400 mt-1">Cancellation rate this month</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 shadow-md bg-white hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Failed Payments</CardTitle>
            <Badge variant="destructive">{stats?.issues?.failedPayments || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.issues?.failedPayments || 0}</div>
            <p className="text-xs text-gray-400 mt-1">Transactions affecting revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Loader2 className="w-5 h-5" /></span>
            Top Performing Coupons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-gray-50 border-gray-100">
                <TableHead className="py-4 pl-6 font-semibold text-gray-600">Coupon Code</TableHead>
                <TableHead className="py-4 font-semibold text-gray-600">Usage Count</TableHead>
                <TableHead className="text-right py-4 pr-6 font-semibold text-gray-600">Revenue Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.charts?.coupons?.map((coupon, index) => (
                <TableRow key={coupon.coupon_used} className="hover:bg-gray-50/50 transition-colors border-gray-100">
                  <TableCell className="font-semibold text-indigo-600 pl-6 border-l-4 border-l-transparent hover:border-l-indigo-500 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      {coupon.coupon_used}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {coupon.usage_count} uses
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-900 pr-6 py-4">
                    ₹{parseFloat(coupon.total_revenue).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!stats?.charts?.coupons || stats.charts.coupons.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400">
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