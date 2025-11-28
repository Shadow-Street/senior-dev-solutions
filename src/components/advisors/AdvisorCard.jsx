
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star, CheckCircle, Shield, Lock, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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
        const reviews = await base44.entities.AdvisorReview.filter({ advisor_id: advisor.id, status: 'approved' });
        if (reviews.length > 0) {
          const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
          setAverageRating(Math.round(avgRating * 10) / 10);
        }
        setReviewCount(reviews.length);

        // Load lowest priced plan
        const plans = await base44.entities.AdvisorPlan.filter({ advisor_id: advisor.id, is_active: true });
        if (plans.length > 0) {
          const cheapestPlan = plans.reduce((min, plan) => plan.price < min.price ? plan : min);
          setDisplayPlan({
            price: cheapestPlan.price,
            interval: cheapestPlan.billing_interval
          });
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
    <Card className="flex flex-col hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden bg-white border border-gray-200">
            <CardHeader className="text-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-t-xl">
                <div className="flex justify-center mb-4">
                    <img
            src={advisor.profile_image_url || `https://avatar.vercel.sh/${advisor.display_name}.png`}
            alt={advisor.display_name}
            className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover" />

                </div>
                
                {/* Advisor Name and Badges */}
                <div className="space-y-2">
                    <CardTitle className="text-xl font-bold text-slate-800">
                        {advisor.display_name}
                    </CardTitle>
                    
                    {/* Trust Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {/* SEBI Verified Badge */}
                        <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-xl flex items-center gap-1 shadow-md">
                            <Shield className="w-3 h-3" />
                            SEBI Verified
                        </Badge>
                        
                        {/* Rating Badge */}
                        {averageRating > 0 &&
            <Badge
              variant="outline"
              className="bg-amber-50 border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">

                                <Star className="w-3 h-3 fill-current text-amber-500" />
                                {averageRating}/5
                            </Badge>
            }
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 flex-1 space-y-4">
                {/* Bio */}
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                    {truncatedBio}
                </p>

                {/* Specialization Tags */}
                <div className="flex flex-wrap gap-2 justify-center">
                    {advisor.specialization?.slice(0, 2).map((spec) =>
          <Badge key={spec} variant="secondary" className="text-xs bg-blue-100 text-blue-700 rounded-lg px-2 py-1">
                            {spec}
                        </Badge>
          )}
                </div>

                {/* Stats */}
                <div className="flex justify-around pt-4 border-t border-slate-100">
                    <div className="text-center">
                        <p className="font-bold text-lg text-slate-800">{advisor.follower_count || 0}</p>
                        <p className="text-xs text-slate-500">Subscribers</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-slate-800">{reviewCount}</p>
                        <p className="text-xs text-slate-500">Reviews</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-slate-800">{advisor.success_rate || 'N/A'}%</p>
                        <p className="text-xs text-slate-500">Success Rate</p>
                    </div>
                </div>

                {/* Enhanced Subscribe Button with Feature Gate */}
                {!isSubscribed && (
                  <Button
                    onClick={() => hasFeatureAccess ? onSubscribe(advisor) : null}
                    className={`w-full h-10 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 mt-4 ${
                      hasFeatureAccess
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-lg hover:scale-105'
                        : 'bg-gray-300 text-gray-700 cursor-not-allowed'
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

            <CardFooter className="flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-b-xl">
                {/* Pricing */}
                <div className="text-center mb-4">
                    <span className="text-2xl font-bold text-slate-800">₹{displayPlan.price.toLocaleString()}</span>
                    <span className="text-slate-500 ml-1">/{displayPlan.interval.replace('ly', '')}</span>
                </div>
                
                {/* Subscribed State Button */}
                {isSubscribed && (
                    <Link to={createPageUrl(`AdvisorProfile?id=${advisor.id}`)} className="w-full">
                        <Button className="w-full h-10 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg hover:scale-105">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Subscribed - View Profile
                        </Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
  );
}
