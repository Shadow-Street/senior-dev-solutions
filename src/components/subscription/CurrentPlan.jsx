
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Star, Users, Lock, Shield, BarChart3, ArrowLeft, Crown, Sparkles, Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

export default function CurrentPlan({ subscription, onUpgrade, onReactivate, onCancelSubscription, isCancelling, isReactivating }) {
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [isTogglingAutopay, setIsTogglingAutopay] = useState(false);

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

      // Set initial autopay state
      setAutopayEnabled(subscription.auto_renew || false);
    }
  }, [subscription]);

  const handleToggleAutopay = async () => {
    if (isTogglingAutopay) return;

    setIsTogglingAutopay(true);
    try {
      if (autopayEnabled) {
        // Disable autopay
        await apiClient.post('/subscriptions/autopay/disable', {
          reason: 'User disabled auto-renewal'
        });
        setAutopayEnabled(false);
        toast.success('Auto-renewal disabled successfully');
      } else {
        // Enable autopay
        await apiClient.post('/subscriptions/autopay/enable');
        setAutopayEnabled(true);
        toast.success('Auto-renewal enabled successfully');
      }
    } catch (error) {
      console.error('Error toggling autopay:', error);
      toast.error('Failed to update auto-renewal setting');
    } finally {
      setIsTogglingAutopay(false);
    }
  };

  if (!subscription) return null;

  // ✅ FIX: Check if subscription is cancelled
  const isCancelled = subscription.cancelAtPeriodEnd === true;
  const isExpired = daysRemaining <= 0;
  const isNearExpiry = daysRemaining <= 7 && daysRemaining > 0;

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge className="bg-protocall-sell-text text-white">Expired</Badge>;
    }
    if (isCancelled) {
      return <Badge className="bg-hold text-hold-foreground">Cancelled - Active Until {new Date(subscription.end_date).toLocaleDateString()}</Badge>;
    }
    if (isNearExpiry) {
      return <Badge className="bg-hold text-hold-foreground">Expiring Soon</Badge>;
    }
    return <Badge className="bg-buy text-buy-foreground">Active</Badge>;
  };

  const getPlanIcon = () => {
    const planType = subscription.plan_type?.toLowerCase() || '';
    if (planType.includes('vip') || planType.includes('elite')) {
      return <Crown className="w-8 h-8 text-hold" />;
    }
    if (planType.includes('premium')) {
      return <Sparkles className="w-8 h-8 text-protocall-premium-light" />;
    }
    return <CheckCircle className="w-8 h-8 text-protocall-premium-light" />;
  };

  const getPlanColor = () => {
    const planType = subscription.plan_type?.toLowerCase() || '';
    if (planType.includes('vip') || planType.includes('elite')) {
      return 'from-hold to-hold';
    }
    if (planType.includes('premium')) {
      return 'from-protocall-deep to-protocall-blue';
    }
    return 'from-protocall-blue to-protocall-blue';
  };

  return (
    <Card className="border-2 border-protocall-premium-light bg-surface-2 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-protocall-grape to-protocall-blue opacity-20 rounded-full transform translate-x-32 -translate-y-32"></div>

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
              <p className="text-subtle mt-1">
                {isCancelled
                  ? `Access until ${new Date(subscription.end_date).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.end_date).toLocaleDateString()}`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-protocall-premium-text">₹{subscription.price}</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        {/* Subscription Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-subtle">
                {isExpired ? 'Subscription Expired' : isCancelled ? 'Cancelled - Days Remaining' : 'Days Remaining'}
              </span>
            </div>
            <span className="font-semibold">
              {daysRemaining} of {totalDays} days
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Autopay Toggle */}
        <div className="bg-white/60 rounded-lg p-4 border-2 border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Auto-Renewal</h4>
              <p className="text-sm text-subtle">
                {autopayEnabled
                  ? 'Your subscription will automatically renew'
                  : 'Enable to automatically renew your subscription'}
              </p>
            </div>
            <Switch
              checked={autopayEnabled}
              onCheckedChange={handleToggleAutopay}
              disabled={isTogglingAutopay || isExpired}
              className="data-[state=checked]:bg-buy"
            />
          </div>
        </div>

        {/* Cancellation Warning */}
        {isCancelled && !isExpired && (
          <div className="bg-hold-muted border-2 border-hold/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-hold-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-hold-muted-foreground mb-1">Subscription Cancelled</h4>
                <p className="text-sm text-hold-muted-foreground">
                  Your subscription will end on {new Date(subscription.end_date).toLocaleDateString()}.
                  You can still access all premium features until then.
                </p>
                {subscription.cancellation_reason && (
                  <p className="text-xs text-hold-muted-foreground mt-2">
                    <strong>Cancellation reason:</strong> {subscription.cancellation_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expiry Warning */}
        {isNearExpiry && !isCancelled && !isExpired && (
          <div className="bg-hold-muted border-2 border-hold/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-hold-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-hold-muted-foreground mb-1">Subscription Expiring Soon</h4>
                <p className="text-sm text-hold-muted-foreground">
                  Your subscription will expire in {daysRemaining} days. Renew now to continue enjoying premium features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div className="bg-sell-muted border-2 border-sell/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-sell-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-sell-muted-foreground mb-1">Subscription Expired</h4>
                <p className="text-sm text-sell-muted-foreground">
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
                className="flex-1 bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white rounded-full shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                Upgrade Plan
              </Button>
              <Button
                onClick={onCancelSubscription}
                variant="outline"
                disabled={isCancelling}
                className="flex-1 border-sell/30 text-sell-muted-foreground hover:bg-sell-muted rounded-full"
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
              className="w-full bg-buy-soft hover:from-buy hover:to-buy-soft text-buy-foreground rounded-full shadow-lg"
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
              className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white rounded-full shadow-lg"
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
