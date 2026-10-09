
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star, CheckCircle, Shield, Lock, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import apiClient from '@/lib/apiClient';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

export default function AdvisorCard({ advisor, onSubscribe, userSubscriptions }) {
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [displayPlan, setDisplayPlan] = useState({ price: 999, interval: 'monthly' });
  const { hasFeatureAccess } = useFeatureAccess('advisor_subscriptions');

  useEffect(() => {
    const loadAdvisorData = async () => {
      try {
        // Load reviews to calculate rating
        // Replaced base44 with api call placeholder - this endpoint should be implemented in backend
        // For now, getting mock reviews or empty array if endpoint fails
        let reviews = [];
        try {
          // const res = await apiClient.get(/advisors/${advisor.id}/reviews);
          // reviews = res.data;
          reviews = []; // Fallback until endpoint is ready
        } catch (e) {
          console.log('Error fetching reviews via API');
        }

        if (reviews.length > 0) {
          const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
          setAverageRating(Math.round(avgRating * 10) / 10);
        }
        setReviewCount(reviews.length);

        // Load lowest priced plan
        try {
          // const res = await apiClient.get(/advisors/${advisor.id}/plans);
          // const plans = res.data;
          const plans = []; // Fallback
          if (plans.length > 0) {
            const cheapestPlan = plans.reduce((min, plan) => plan.price < min.price ? plan : min);
            setDisplayPlan({
              price: cheapestPlan.price,
              interval: cheapestPlan.billing_interval
            });
          }
        } catch (e) {
          console.log('Error fetching plans via API');
        }
      } catch (error) {
        console.error("Error loading advisor data:", error);
      }
    };
    loadAdvisorData();
  }, [advisor.id]);

  // Only show approved advisors
  if (!advisor.status || advisor.status !== 'approved') {
    return null;
  }

  const truncatedBio = advisor.bio && advisor.bio.length > 120 ?
    advisor.bio.substring(0, 120) + '...' :
    advisor.bio || 'Professional stock market advisor';

  const isSubscribed = userSubscriptions?.some(sub => sub.advisor_id === advisor.id);

  return (
    <Card className="flex flex-col hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden bg-white border border-border">
      <CardHeader className="text-center p-6 bg-surface-2 rounded-t-xl">
        <div className="flex justify-center mb-4">
          <img
            src={advisor.profile_image_url || `https://avatar.vercel.sh/${advisor.display_name}.png`}
            alt={advisor.display_name}
            className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover" />

        </div>

        {/* Advisor Name and Badges */}
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold text-foreground">
            {advisor.display_name}
          </CardTitle>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* SEBI Verified Badge */}
            <Badge className="bg-buy hover:bg-buy text-buy-foreground text-xs font-medium px-3 py-1 rounded-xl flex items-center gap-1 shadow-md">
              <Shield className="w-3 h-3" />
              SEBI Verified
            </Badge>

            {/* Rating Badge */}
            {averageRating > 0 &&
              <Badge
                variant="outline"
                className="bg-hold-muted border-hold/30 text-hold-muted-foreground text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">

                <Star className="w-3 h-3 fill-current text-hold" />
                {averageRating}/5
              </Badge>
            }
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex-1 space-y-4">
        {/* Bio */}
        <p className="text-sm text-subtle text-center leading-relaxed">
          {truncatedBio}
        </p>

        {/* Specialization Tags */}
        <div className="flex flex-wrap gap-2 justify-center">
          {advisor.specialization?.slice(0, 2).map((spec) =>
            <Badge key={spec} variant="secondary" className="text-xs bg-premium-muted text-primary rounded-lg px-2 py-1">
              {spec}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-around pt-4 border-t border-divider">
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{advisor.follower_count || 0}</p>
            <p className="text-xs text-muted-foreground">Subscribers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{reviewCount}</p>
            <p className="text-xs text-muted-foreground">Reviews</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{advisor.success_rate || 'N/A'}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        </div>

        {/* Enhanced Subscribe Button with Feature Gate */}
        {!isSubscribed && (
          <Button
            onClick={() => hasFeatureAccess ? onSubscribe(advisor) : null}
            className={`w-full h-10 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 mt-4 ${hasFeatureAccess
                ? 'bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue text-white hover:shadow-lg hover:scale-105'
                : 'bg-border text-subtle cursor-not-allowed'
              }`}
            disabled={!hasFeatureAccess}
          >
            {hasFeatureAccess ? (
              <>
                <Star className="w-4 h-4 mr-2" />
                Subscribe to Advisor
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                VIP Feature - Upgrade Required
              </>
            )}
          </Button>
        )}
      </CardContent>

      <CardFooter className="flex flex-col p-6 bg-surface-2 rounded-b-xl">
        {/* Pricing */}
        <div className="text-center mb-4">
          <span className="text-2xl font-bold text-foreground">₹{displayPlan.price.toLocaleString()}</span>
          <span className="text-muted-foreground ml-1">/{displayPlan.interval.replace('ly', '')}</span>
        </div>

        {/* Subscribed State Button */}
        {isSubscribed && (
          <Link to={createPageUrl(`AdvisorProfile?id=${advisor.id}`)} className="w-full">
            <Button className="w-full h-10 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 bg-buy-soft text-buy-foreground hover:from-buy hover:to-buy hover:shadow-lg hover:scale-105">
              <CheckCircle className="w-4 h-4 mr-2" />
              Subscribed - View Profile
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
