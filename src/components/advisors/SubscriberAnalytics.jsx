import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function SubscriberAnalytics({ subscriptions, plans }) {
  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-buy-muted text-buy-muted-foreground', label: 'Active', icon: CheckCircle },
      cancelled: { color: 'bg-sell-muted text-sell-muted-foreground', label: 'Cancelled', icon: XCircle },
      expired: { color: 'bg-surface-2 text-foreground', label: 'Expired', icon: Clock },
      payment_failed: { color: 'bg-hold-muted text-hold-muted-foreground', label: 'Payment Failed', icon: XCircle }
    };
    const { color, label, icon: Icon } = config[status] || config.active;
    return (
      <Badge className={`${color} border-0 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.name || 'Unknown Plan';
  };

  const getPlanPrice = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.price || 0;
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    return days > 0 ? days : 0;
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalRevenue = subscriptions.reduce((sum, s) => {
    const plan = plans.find(p => p.id === s.plan_id);
    return sum + (plan?.price || 0);
  }, 0);

  const avgSubscriptionDuration = subscriptions.length > 0
    ? subscriptions.reduce((sum, s) => {
        if (s.start_date && s.end_date) {
          return sum + differenceInDays(new Date(s.end_date), new Date(s.start_date));
        }
        return sum;
      }, 0) / subscriptions.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-subtle">Total Subscribers</p>
                <p className="text-2xl font-bold text-foreground">{subscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-buy-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-subtle">Active Now</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">{activeSubscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-protocall-premium-text" />
              <div className="ml-4">
                <p className="text-sm font-medium text-subtle">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-hold-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-subtle">Avg Duration</p>
                <p className="text-2xl font-bold text-foreground">{Math.round(avgSubscriptionDuration)} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length > 0 ? (
            <div className="space-y-4">
              {subscriptions.map((sub) => {
                const daysRemaining = getDaysRemaining(sub.end_date);
                const planPrice = getPlanPrice(sub.plan_id);
                
                return (
                  <Card key={sub.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
                              {sub.user_id?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground">Subscriber #{sub.user_id?.substring(0, 8)}</h4>
                              {getStatusBadge(sub.status)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Plan</p>
                                <p className="font-medium text-foreground">{getPlanName(sub.plan_id)}</p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground text-xs">Monthly Revenue</p>
                                <p className="font-medium text-buy-muted-foreground">₹{planPrice.toLocaleString()}</p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground text-xs">Started</p>
                                <p className="font-medium text-foreground">
                                  {format(new Date(sub.start_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  {sub.status === 'active' ? 'Renews In' : 'Ended'}
                                </p>
                                <p className="font-medium text-foreground">
                                  {sub.end_date ? (
                                    sub.status === 'active' && daysRemaining > 0 ? (
                                      <span className="text-hold-muted-foreground">{daysRemaining} days</span>
                                    ) : (
                                      format(new Date(sub.end_date), 'MMM dd, yyyy')
                                    )
                                  ) : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {sub.auto_renew && sub.status === 'active' && (
                              <div className="mt-3">
                                <Badge className="bg-premium-muted text-primary border-0 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Auto-Renew Enabled
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">Lifetime Value</p>
                          <p className="text-lg font-bold text-protocall-premium-text">₹{planPrice.toLocaleString()}</p>
                          {sub.payment_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Payment ID: {sub.payment_id.substring(0, 10)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No subscribers yet</p>
              <p className="text-muted-foreground text-sm">Subscribers will appear here once they subscribe to your plans</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}