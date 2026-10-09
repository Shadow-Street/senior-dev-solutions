import React, { useState, useEffect } from 'react';
import { FeatureConfig } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';

export default function LifecycleAnalytics({ user }) {
  const [analytics, setAnalytics] = useState({
    totalModules: 0,
    byType: {},
    byStatus: {},
    byTier: {},
    recentChanges: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const allModules = await FeatureConfig.list();

      const byType = {};
      const byStatus = {};
      const byTier = {};

      allModules.forEach(module => {
        // By type
        byType[module.module_type] = (byType[module.module_type] || 0) + 1;

        // By status
        byStatus[module.status] = (byStatus[module.status] || 0) + 1;

        // By tier
        byTier[module.tier] = (byTier[module.tier] || 0) + 1;
      });

      // Recent changes (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentChanges = allModules.filter(m => 
        m.last_status_change_date && new Date(m.last_status_change_date) > sevenDaysAgo
      ).length;

      setAnalytics({
        totalModules: allModules.length,
        byType,
        byStatus,
        byTier,
        recentChanges
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-subtle">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Modules</p>
                <p className="text-3xl font-bold text-foreground">{analytics.totalModules}</p>
              </div>
              <Activity className="w-12 h-12 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Modules</p>
                <p className="text-3xl font-bold text-buy-muted-foreground">{analytics.byStatus.live || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Development</p>
                <p className="text-3xl font-bold text-protocall-premium-text">{analytics.byStatus.placeholder || 0}</p>
              </div>
              <Clock className="w-12 h-12 text-protocall-premium-text" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Changes</p>
                <p className="text-3xl font-bold text-primary">{analytics.recentChanges}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Module Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-subtle capitalize">{type}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-subtle capitalize">{status}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Subscription Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.byTier).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between">
                  <span className="text-sm text-subtle capitalize">{tier}</span>
                  <span className="font-semibold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}