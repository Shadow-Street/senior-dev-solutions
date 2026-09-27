import React from 'react';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * FeatureGate Component - Controls access to premium features
 * Shows locked state with upgrade prompt if user doesn't have access
 * 
 * @param {string} featureKey - The feature key to check
 * @param {React.ReactNode} children - Content to show if user has access
 * @param {string} title - Title for locked state
 * @param {string} description - Description for locked state
 * @param {string} variant - 'full' (full card), 'inline' (inline message), 'blur' (blurred content)
 */
export default function FeatureGate({ 
  featureKey, 
  children, 
  title, 
  description,
  variant = 'full',
  fallback = null
}) {
  const { hasAccess, userPlan, requiredPlan, isLoading, isPremiumFeature } = useFeatureAccess(featureKey);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-protocall-blue"></div>
      </div>
    );
  }

  // If user has access, show the content
  if (hasAccess) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show locked state based on variant
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg border border-protocall-premium-light">
        <div className="p-2 bg-premium-muted rounded-lg">
          <Lock className="w-5 h-5 text-protocall-premium-text" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{title || 'Premium Feature'}</p>
          <p className="text-xs text-subtle">{description || `Upgrade to ${requiredPlan} to unlock`}</p>
        </div>
        <Link to={createPageUrl('Subscription')}>
          <Button size="sm" className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue">
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  if (variant === 'blur') {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none select-none opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-2 border-protocall-premium-light">
            <CardContent className="p-6 text-center">
              <div className="inline-flex p-4 bg-surface-2 rounded-full mb-4">
                <Lock className="w-8 h-8 text-protocall-premium-text" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{title || 'Premium Feature Locked'}</h3>
              <p className="text-sm text-subtle mb-4">
                {description || `This feature requires a ${requiredPlan} subscription`}
              </p>
              <Badge className="mb-4 bg-premium-muted text-protocall-premium-text border-protocall-premium-light">
                Your Plan: {userPlan} → Required: {requiredPlan}
              </Badge>
              <Link to={createPageUrl('Subscription')}>
                <Button className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to {requiredPlan}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default: full card variant
  return (
    <Card className="bg-surface-2 border-2 border-protocall-premium-light shadow-lg">
      <CardContent className="p-8 text-center">
        <div className="inline-flex p-6 bg-surface-2 rounded-full mb-6">
          <Lock className="w-12 h-12 text-protocall-premium-text" />
        </div>
        
        <h3 className="text-2xl font-bold text-foreground mb-3">
          {title || 'Premium Feature'}
        </h3>
        
        <p className="text-subtle mb-6 max-w-md mx-auto">
          {description || `Unlock this exclusive feature by upgrading to ${requiredPlan} plan`}
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Badge variant="outline" className="text-sm px-4 py-2">
            Current: {userPlan}
          </Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge className="text-sm px-4 py-2 bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
            Required: {requiredPlan}
          </Badge>
        </div>

        <div className="space-y-3">
          <Link to={createPageUrl('Subscription')}>
            <Button size="lg" className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white shadow-lg hover:shadow-xl transition-all">
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to {requiredPlan}
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          <Link to={createPageUrl('Subscription')}>
            <Button size="lg" variant="outline" className="w-full">
              View All Plans
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}