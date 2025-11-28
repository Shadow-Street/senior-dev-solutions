import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { useSubscription } from '../components/hooks/useSubscription';

export default function SubscriptionTest() {
  const { 
    subscription, 
    subscriptionPlan, 
    isLoading, 
    hasPremiumAccess, 
    hasVipAccess,
    isSubscribed 
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading subscription data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Subscription Debug Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-2">Is Subscribed</p>
              <div className="flex items-center gap-2">
                {isSubscribed ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">Yes</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <Badge className="bg-red-100 text-red-800">No</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-2">Has Premium Access</p>
              <div className="flex items-center gap-2">
                {hasPremiumAccess() ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">Yes</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <Badge className="bg-red-100 text-red-800">No</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-2">Has VIP Access</p>
              <div className="flex items-center gap-2">
                {hasVipAccess() ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">Yes</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <Badge className="bg-red-100 text-red-800">No</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-2">Plan Type</p>
              <Badge className="bg-purple-100 text-purple-800">
                {subscription?.plan_type || 'None'}
              </Badge>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">📋 Subscription Details</h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">📦 Subscription Plan</h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(subscriptionPlan, null, 2)}
            </pre>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}