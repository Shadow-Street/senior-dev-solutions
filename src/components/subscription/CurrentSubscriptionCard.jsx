import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, AlertTriangle, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";

export default function CurrentSubscriptionCard({ subscription, onRenew, onCancel }) {
    console.log("subscription", subscription);
    console.log("onRenew", onRenew);
    if (!subscription) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return format(new Date(dateString), 'MM/dd/yyyy');
    };

    const calculateDaysRemaining = () => {
        if (!subscription.end_date) return 0;
        const today = new Date();
        const end = new Date(subscription.end_date);
        const diff = differenceInDays(end, today);
        return Math.max(0, diff);
    };

    const calculateProgress = () => {
        if (!subscription.start_date || !subscription.end_date) return 0;
        const start = new Date(subscription.start_date);
        const end = new Date(subscription.end_date);
        const today = new Date();

        const totalDuration = differenceInDays(end, start);
        const elapsed = differenceInDays(today, start);

        if (totalDuration <= 0) return 100;
        // If expired, progress is full or empty depending on design? 
        // Mockup shows "0 of 30 days" and Red bar for expired.
        // If we want "days remaining" bar: 
        const percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        return percentage;
    };

    const daysRemaining = calculateDaysRemaining();
    const isExpired = subscription.status === 'expired' || daysRemaining <= 0;
    const progress = calculateProgress();
    const planName = subscription.plan_type ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1) : 'Free';
    const isVip = planName.toLowerCase() === 'vip';

    // Styles based on status
    const cardBorder = isExpired ? 'border-red-200' : 'border-purple-200';
    const iconBg = isExpired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600';

    return (
        <Card className={`mb-8 border-2 ${cardBorder} shadow-sm bg-white overflow-hidden`}>
            <CardContent className="p-6 md:p-8">
                <div className="flex flex-col gap-6">

                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${isVip ? 'bg-orange-100' : 'bg-purple-100'}`}>
                                <Crown className={`w-8 h-8 ${isVip ? 'text-orange-600' : 'text-purple-600'}`} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    {planName} Plan
                                    {isExpired ? (
                                        <Badge variant="destructive" className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                            Expired
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                            Active
                                        </Badge>
                                    )}
                                </h2>
                                <div className="flex flex-col gap-1 text-sm text-gray-500 mt-1 font-medium">
                                    <span>Renews on {formatDate(subscription.end_date)}</span>
                                    {!isExpired && (
                                        <span className={`flex items-center gap-2 ${subscription.auto_renew ? 'text-green-600' : 'text-amber-600'}`}>
                                            <div className={`w-2 h-2 rounded-full ${subscription.auto_renew ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                            Auto-pay: {subscription.auto_renew ? 'ON' : 'OFF'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-right hidden md:block">
                            <span className="text-2xl font-bold text-gray-900">₹{subscription.SubscriptionPlan?.price_monthly || subscription.amount || '0'}</span>
                            <span className="text-gray-500 text-sm font-medium">/{subscription.billing_cycle || 'month'}</span>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className={isExpired ? 'text-red-600' : 'text-gray-600'}>
                                {isExpired ? 'Subscription Expired' : `${daysRemaining} days remaining`}
                            </span>
                            <span className="text-gray-400">
                                {isExpired ? '0 of 30 days' : `${30 - daysRemaining} of 30 days`}
                            </span>
                        </div>

                        <Progress
                            value={isExpired ? 100 : progress}
                            className={`h-2.5 rounded-full ${isExpired ? 'bg-red-100' : 'bg-gray-100'}`}
                            indicatorClassName={isExpired ? 'bg-red-500' : isVip ? 'bg-orange-500' : 'bg-purple-600'}
                        />
                    </div>

                    {/* Alert Box (Only if Expired) */}
                    {isExpired && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-red-800">Subscription Expired</h4>
                                <p className="text-sm text-red-600 mt-0.5">
                                    Your subscription has expired. Renew now to regain access to premium features.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-2">
                        {isExpired ? (
                            <Button
                                onClick={onRenew}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-md shadow-md transition-all rounded-xl"
                            >
                                Renew Subscription
                                <CheckCircle2 className="ml-2 w-5 h-5" />
                            </Button>
                        ) : (
                            onCancel && (
                                <Button
                                    variant="outline"
                                    onClick={onCancel}
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    Cancel Subscription
                                </Button>
                            )
                        )}
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
