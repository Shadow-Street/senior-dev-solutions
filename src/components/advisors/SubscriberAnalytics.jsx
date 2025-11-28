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
      active: { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircle },
      expired: { color: 'bg-gray-100 text-gray-800', label: 'Expired', icon: Clock },
      payment_failed: { color: 'bg-orange-100 text-orange-800', label: 'Payment Failed', icon: XCircle }
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
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Subscribers</p>
                <p className="text-2xl font-bold text-slate-900">{subscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Now</p>
                <p className="text-2xl font-bold text-green-900">{activeSubscriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Avg Duration</p>
                <p className="text-2xl font-bold text-slate-900">{Math.round(avgSubscriptionDuration)} days</p>
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
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                              {sub.user_id?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-slate-800">Subscriber #{sub.user_id?.substring(0, 8)}</h4>
                              {getStatusBadge(sub.status)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500 text-xs">Plan</p>
                                <p className="font-medium text-slate-900">{getPlanName(sub.plan_id)}</p>
                              </div>
                              
                              <div>
                                <p className="text-slate-500 text-xs">Monthly Revenue</p>
                                <p className="font-medium text-green-700">₹{planPrice.toLocaleString()}</p>
                              </div>
                              
                              <div>
                                <p className="text-slate-500 text-xs">Started</p>
                                <p className="font-medium text-slate-900">
                                  {format(new Date(sub.start_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-slate-500 text-xs">
                                  {sub.status === 'active' ? 'Renews In' : 'Ended'}
                                </p>
                                <p className="font-medium text-slate-900">
                                  {sub.end_date ? (
                                    sub.status === 'active' && daysRemaining > 0 ? (
                                      <span className="text-orange-600">{daysRemaining} days</span>
                                    ) : (
                                      format(new Date(sub.end_date), 'MMM dd, yyyy')
                                    )
                                  ) : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {sub.auto_renew && sub.status === 'active' && (
                              <div className="mt-3">
                                <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Auto-Renew Enabled
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-1">Lifetime Value</p>
                          <p className="text-lg font-bold text-purple-600">₹{planPrice.toLocaleString()}</p>
                          {sub.payment_id && (
                            <p className="text-xs text-slate-400 mt-1">
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
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No subscribers yet</p>
              <p className="text-slate-400 text-sm">Subscribers will appear here once they subscribe to your plans</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}