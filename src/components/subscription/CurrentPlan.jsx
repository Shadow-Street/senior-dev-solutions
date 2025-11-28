
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Star, Users, Lock, Shield, BarChart3, ArrowLeft, Crown, Sparkles, Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function CurrentPlan({ subscription, onUpgrade, onReactivate, onCancelSubscription, isCancelling, isReactivating }) {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    if (subscription && subscription.start_date && subscription.end_date) {
      const now = new Date();
      const startDate = new Date(subscription.start_date);
      const endDate = new Date(subscription.end_date);

      const total = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const remaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      const elapsed = total - remaining;

      setTotalDays(total);
      setDaysRemaining(Math.max(0, remaining));
      setProgressPercentage(Math.min(100, Math.max(0, (elapsed / total) * 100)));
    }
  }, [subscription]);

  if (!subscription) return null;

  // ✅ FIX: Check if subscription is cancelled
  const isCancelled = subscription.cancelAtPeriodEnd === true;
  const isExpired = daysRemaining <= 0;
  const isNearExpiry = daysRemaining <= 7 && daysRemaining > 0;

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge className="bg-red-500 text-white">Expired</Badge>;
    }
    if (isCancelled) {
      return <Badge className="bg-amber-500 text-white">Cancelled - Active Until {new Date(subscription.end_date).toLocaleDateString()}</Badge>;
    }
    if (isNearExpiry) {
      return <Badge className="bg-amber-500 text-white">Expiring Soon</Badge>;
    }
    return <Badge className="bg-green-500 text-white">Active</Badge>;
  };

  const getPlanIcon = () => {
    const planType = subscription.plan_type?.toLowerCase() || '';
    if (planType.includes('vip') || planType.includes('elite')) {
      return <Crown className="w-8 h-8 text-yellow-500" />;
    }
    if (planType.includes('premium')) {
      return <Sparkles className="w-8 h-8 text-purple-500" />;
    }
    return <CheckCircle className="w-8 h-8 text-blue-500" />;
  };

  const getPlanColor = () => {
    const planType = subscription.plan_type?.toLowerCase() || '';
    if (planType.includes('vip') || planType.includes('elite')) {
      return 'from-yellow-400 to-orange-500';
    }
    if (planType.includes('premium')) {
      return 'from-purple-500 to-blue-500';
    }
    return 'from-blue-400 to-indigo-500';
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200 to-blue-200 opacity-20 rounded-full transform translate-x-32 -translate-y-32"></div>
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 bg-gradient-to-r ${getPlanColor()} rounded-2xl shadow-lg`}>
              {getPlanIcon()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl font-bold capitalize">
                  {subscription.plan_type || 'Unknown'} Plan
                </CardTitle>
                {getStatusBadge()}
              </div>
              <p className="text-gray-600 mt-1">
                {isCancelled 
                  ? `Access until ${new Date(subscription.end_date).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.end_date).toLocaleDateString()}`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-700">₹{subscription.price}</p>
            <p className="text-sm text-gray-500">per month</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {/* Subscription Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {isExpired ? 'Subscription Expired' : isCancelled ? 'Cancelled - Days Remaining' : 'Days Remaining'}
              </span>
            </div>
            <span className="font-semibold">
              {daysRemaining} of {totalDays} days
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Cancellation Warning */}
        {isCancelled && !isExpired && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">Subscription Cancelled</h4>
                <p className="text-sm text-amber-800">
                  Your subscription will end on {new Date(subscription.end_date).toLocaleDateString()}. 
                  You can still access all premium features until then.
                </p>
                {subscription.cancellation_reason && (
                  <p className="text-xs text-amber-700 mt-2">
                    <strong>Cancellation reason:</strong> {subscription.cancellation_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expiry Warning */}
        {isNearExpiry && !isCancelled && !isExpired && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">Subscription Expiring Soon</h4>
                <p className="text-sm text-amber-800">
                  Your subscription will expire in {daysRemaining} days. Renew now to continue enjoying premium features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">Subscription Expired</h4>
                <p className="text-sm text-red-800">
                  Your subscription has expired. Renew now to regain access to premium features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ FIX: REMOVED FEATURES SECTION */}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {/* Active Subscription Actions */}
          {!isCancelled && !isExpired && (
            <>
              <Button 
                onClick={onUpgrade} 
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                Upgrade Plan
              </Button>
              <Button 
                onClick={onCancelSubscription}
                variant="outline"
                disabled={isCancelling}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 rounded-full"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            </>
          )}
          
          {/* Cancelled (but not expired) - Show Reactivate Button */}
          {isCancelled && !isExpired && (
            <Button 
              onClick={onReactivate} 
              disabled={isReactivating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full shadow-lg"
            >
              {isReactivating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reactivate Subscription
                </>
              )}
            </Button>
          )}
          
          {/* Expired - Show Renew Button */}
          {isExpired && (
            <Button 
              onClick={onUpgrade} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
              Renew Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
