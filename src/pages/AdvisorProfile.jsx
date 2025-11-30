import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Star, Users, Lock, Shield, BarChart3, ArrowLeft, Crown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PaymentModal from '../components/subscription/PaymentModal';
import ReviewSection from '../components/advisors/ReviewSection';
import ReviewForm from '../components/advisors/ReviewForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';

export default function AdvisorProfile() {
  const [searchParams] = useSearchParams();
  const advisorId = searchParams.get('id');

  const [advisor, setAdvisor] = useState(null);
  const [plans, setPlans] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState([0, 0, 0, 0, 0]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    if (!advisorId) {
      setError('No advisor ID provided');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Loading advisor profile for ID:', advisorId);

        // Load current user (optional - guest mode allowed)
        const user = await base44.auth.me().catch(() => {
          console.log('👤 Guest mode - no user logged in');
          return null;
        });
        
        if (!isMounted) return;
        setCurrentUser(user);
        console.log('✅ User loaded:', user?.email || 'Guest');

        // Load advisor data - CRITICAL
        const advisorData = await base44.entities.Advisor.get(advisorId);
        if (!isMounted) return;
        
        if (!advisorData) {
          throw new Error('Advisor not found');
        }
        
        setAdvisor(advisorData);
        console.log('✅ Advisor loaded:', advisorData.display_name);

        // Load plans
        try {
          const advisorPlans = await base44.entities.AdvisorPlan.filter({ 
            advisor_id: advisorId, 
            is_active: true 
          });
          if (isMounted) {
            setPlans(advisorPlans || []);
            console.log('✅ Plans loaded:', advisorPlans.length);
          }
        } catch (err) {
          console.warn('⚠️ Plans loading failed:', err.message);
          if (isMounted) setPlans([]);
        }

        // Load reviews
        try {
          const advisorReviews = await base44.entities.AdvisorReview.filter({ 
            advisor_id: advisorId, 
            status: 'approved' 
          }, '-created_date');
          
          if (isMounted) {
            setReviews(advisorReviews || []);
            
            if (advisorReviews && advisorReviews.length > 0) {
              const avgRating = advisorReviews.reduce((sum, review) => sum + review.rating, 0) / advisorReviews.length;
              setAverageRating(Math.round(avgRating * 10) / 10);

              const distribution = [0, 0, 0, 0, 0];
              advisorReviews.forEach((review) => {
                if (review.rating >= 1 && review.rating <= 5) {
                  distribution[review.rating - 1]++;
                }
              });
              setRatingDistribution(distribution);
            }
            console.log('✅ Reviews loaded:', advisorReviews.length);
          }
        } catch (err) {
          console.warn('⚠️ Reviews loading failed:', err.message);
          if (isMounted) setReviews([]);
        }

        // Only load user-specific data if logged in
        if (user) {
          try {
            const userSub = await base44.entities.AdvisorSubscription.filter({ 
              user_id: user.id, 
              advisor_id: advisorId, 
              status: 'active' 
            }, '', 1);
            
            if (isMounted) {
              if (userSub && userSub.length > 0) {
                setSubscription(userSub[0]);
                console.log('✅ User subscription found');

                // Load posts for subscribed users
                try {
                  const allPosts = await base44.entities.AdvisorPost.filter({ 
                    advisor_id: advisorId, 
                    status: 'published' 
                  }, '-created_date', 50);
                  
                  if (isMounted && allPosts) {
                    const userPlanId = userSub[0].plan_id;
                    const userPlan = plans.find(p => p.id === userPlanId);
                    
                    const accessiblePosts = allPosts.filter(post => {
                      if (!post.required_plan_id) return true;
                      if (post.required_plan_id === userPlanId) return true;
                      
                      const postPlan = plans.find(p => p.id === post.required_plan_id);
                      if (userPlan && postPlan && userPlan.price >= postPlan.price) {
                        return true;
                      }
                      
                      return false;
                    });

                    setPosts(accessiblePosts);
                    console.log('✅ Posts loaded:', accessiblePosts.length);
                  }
                } catch (err) {
                  console.warn('⚠️ Posts loading failed:', err.message);
                  if (isMounted) setPosts([]);
                }
              }

              // Check if user has already reviewed
              try {
                const existingReview = await base44.entities.AdvisorReview.filter({ 
                  user_id: user.id, 
                  advisor_id: advisorId 
                }, '', 1);
                
                if (isMounted && existingReview && existingReview.length > 0) {
                  setUserReview(existingReview[0]);
                }
              } catch (err) {
                console.warn('⚠️ User review check failed:', err.message);
              }
            }
          } catch (err) {
            console.warn('⚠️ User subscription check failed:', err.message);
            if (isMounted) setSubscription(null);
          }
        }

      } catch (error) {
        console.error('❌ Error loading advisor profile:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load advisor profile');
          toast.error('Could not load advisor profile. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [advisorId]);

  const handlePlanSelect = (plan) => {
    if (!currentUser) {
      toast.info("Please log in to subscribe.");
      return;
    }
    if (currentUser.app_role === 'basic' || !currentUser.app_role) {
      toast.error("Free users cannot subscribe. Please upgrade your platform membership first.", {
        action: <Link to={createPageUrl("Subscription")}><Button size="sm">Upgrade</Button></Link>
      });
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (plan, paymentInfo) => {
    console.log('💳 Payment success:', { plan: plan.name, paymentInfo });
    
    if (!currentUser || !advisor) {
      toast.error("User or advisor information missing");
      return;
    }

    if (!paymentInfo) {
      console.error("Payment info is undefined");
      toast.error("Payment information is missing. Please contact support.");
      return;
    }

    try {
      const settings = await base44.entities.PlatformSetting.filter({ 
        setting_key: 'global_commission_rate' 
      });
      const commissionRate = settings.length > 0 ? parseFloat(settings[0].setting_value) : 20;

      const subData = {
        user_id: currentUser.id,
        advisor_id: advisor.id,
        plan_id: plan.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        payment_id: paymentInfo.paymentId,
        posts_read: 0,
        engagement_score: 0,
        notifications_enabled: true
      };
      
      const newSubscription = await base44.entities.AdvisorSubscription.create(subData);
      setSubscription(newSubscription);

      const platform_fee = plan.price * (commissionRate / 100);
      const advisor_payout = plan.price - platform_fee;
      
      await base44.entities.CommissionTracking.create({
        subscription_id: newSubscription.id,
        advisor_id: advisor.id,
        user_id: currentUser.id,
        gross_amount: plan.price,
        platform_commission_rate: commissionRate,
        platform_fee: platform_fee,
        advisor_payout: advisor_payout,
        transaction_date: new Date().toISOString()
      });

      await base44.entities.Advisor.update(advisor.id, { 
        follower_count: (advisor.follower_count || 0) + 1 
      });
      
      const allPosts = await base44.entities.AdvisorPost.filter({ 
        advisor_id: advisorId, 
        status: 'published' 
      }, '-created_date', 50);
      
      const accessiblePosts = allPosts.filter(post => {
        if (!post.required_plan_id) return true;
        if (post.required_plan_id === plan.id) return true;
        
        const postPlan = plans.find(p => p.id === post.required_plan_id);
        if (postPlan && plan.price >= postPlan.price) {
          return true;
        }
        
        return false;
      });
      
      setPosts(accessiblePosts);

      toast.success(`You are now subscribed to ${advisor.display_name}!`);
    } catch (error) {
      console.error("❌ Subscription processing failed:", error);
      toast.error("An error occurred during subscription. Please contact support.");
    } finally {
      setShowPaymentModal(false);
      setSelectedPlan(null);
    }
  };

  const handleReviewSubmit = async (rating, reviewText) => {
    if (!currentUser || !advisor) return;

    try {
      if (userReview) {
        await base44.entities.AdvisorReview.update(userReview.id, { 
          rating, 
          review: reviewText 
        });
        setUserReview({ ...userReview, rating, review: reviewText });
        toast.success("Review updated successfully!");
      } else {
        const newReview = await base44.entities.AdvisorReview.create({
          advisor_id: advisor.id,
          user_id: currentUser.id,
          rating,
          review: reviewText,
          status: 'approved'
        });
        setUserReview(newReview);
        toast.success("Review submitted successfully!");
      }

      const updatedReviews = await base44.entities.AdvisorReview.filter({ 
        advisor_id: advisorId, 
        status: 'approved' 
      }, '-created_date');
      setReviews(updatedReviews);

      if (updatedReviews.length > 0) {
        const avgRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length;
        setAverageRating(Math.round(avgRating * 10) / 10);

        const distribution = [0, 0, 0, 0, 0];
        updatedReviews.forEach((review) => {
          if (review.rating >= 1 && review.rating <= 5) {
            distribution[review.rating - 1]++;
          }
        });
        setRatingDistribution(distribution);
      }

    } catch (error) {
      console.error("❌ Failed to submit review:", error);
      toast.error("Failed to submit review. Please try again.");
    }
  };

  const canLeaveReview = currentUser && subscription;

  const getPostPlanBadge = (postPlanId) => {
    if (!postPlanId) {
      return (
        <Badge className="bg-blue-100 text-blue-800 text-xs">
          <Users className="w-3 h-3 mr-1" />
          All Subscribers
        </Badge>
      );
    }
    
    const plan = plans.find(p => p.id === postPlanId);
    if (!plan) return null;
    
    const isHighTier = plan.price >= 2000;
    
    return (
      <Badge className={`text-xs flex items-center gap-1 ${
        isHighTier 
          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' 
          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
      }`}>
        {isHighTier ? <Crown className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        {plan.name} Exclusive
      </Badge>
    );
  };

  const getRecommendationBadge = (post) => {
    if (!post.recommendation_status || post.recommendation_status === 'active') return null;
    
    const config = {
      target_hit: { color: 'bg-green-100 text-green-800 border-green-300', label: '🎯 Target Hit', icon: '✅' },
      stop_loss_hit: { color: 'bg-red-100 text-red-800 border-red-300', label: '⚠️ Stop Loss', icon: '🛑' },
      expired: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Expired', icon: '⏰' },
      closed: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Closed', icon: '✓' }
    };
    
    const status = config[post.recommendation_status];
    if (!status) return null;
    
    return (
      <Badge className={`${status.color} border text-xs font-semibold`}>
        {status.label}
        {post.return_percentage && (
          <span className="ml-1">({post.return_percentage > 0 ? '+' : ''}{post.return_percentage.toFixed(1)}%)</span>
        )}
      </Badge>
    );
  };

  const getPlanColor = (planName) => {
    const name = planName?.toLowerCase();
    if (name?.includes('vip') || name?.includes('diamond') || name?.includes('gold')) {
      return 'from-amber-500 to-orange-600';
    }
    if (name?.includes('premium') || name?.includes('pro') || name?.includes('plus')) {
      return 'from-purple-500 to-pink-600';
    }
    if (name?.includes('basic') || name?.includes('starter') || name?.includes('momentum')) {
      return 'from-blue-500 to-cyan-600';
    }
    return 'from-indigo-500 to-purple-600';
  };

  const getPlanIcon = (planName) => {
    const name = planName?.toLowerCase();
    if (name?.includes('vip') || name?.includes('diamond') || name?.includes('gold')) {
      return '👑';
    }
    if (name?.includes('premium') || name?.includes('pro') || name?.includes('plus')) {
      return '⭐';
    }
    if (name?.includes('basic') || name?.includes('starter') || name?.includes('momentum')) {
      return '📊';
    }
    return '💎';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading advisor profile..." />
      </div>
    );
  }

  if (error || !advisor) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl("Advisors")}>
            <Button variant="outline" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Advisors
            </Button>
          </Link>
          <Card className="border-red-200">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {error || 'Advisor Not Found'}
              </h2>
              <p className="text-slate-600 mb-6">
                The advisor you're looking for could not be loaded. Please try again or contact support.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
                <Link to={createPageUrl("Advisors")}>
                  <Button>Back to Advisors</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <Link to={createPageUrl("Advisors")}>
            <Button variant="outline" className="mb-4 flex items-center gap-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50">
              <ArrowLeft className="w-4 h-4" />
              Back to Advisors
            </Button>
          </Link>

          {/* PROFILE HEADER WITH RATING SUMMARY */}
          <Card className="overflow-hidden border-0 shadow-xl rounded-xl">
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 h-32 rounded-t-xl" />
            <div className="p-8 flex flex-col md:flex-row items-start gap-8 -mt-16">
              <img
                src={advisor.profile_image_url || `https://avatar.vercel.sh/${advisor.display_name}.png`}
                alt={advisor.display_name}
                className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-2xl object-cover"
              />
              <div className="pt-16 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-slate-800">{advisor.display_name}</h1>
                  <Badge className="bg-green-500 hover:bg-green-600 text-white font-medium px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md">
                    <Shield className="w-4 h-4" />
                    SEBI Verified
                  </Badge>
                  {averageRating > 0 && (
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm">
                      <Star className="w-4 h-4 fill-current text-amber-500" />
                      {averageRating}/5 ({reviews.length} reviews)
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-6 mb-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{advisor.follower_count || 0} Subscribers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>{advisor.success_rate || 'N/A'}% Success Rate</span>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">{advisor.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {advisor.specialization?.map((spec) => (
                    <Badge key={spec} variant="secondary" className="bg-blue-100 text-blue-700 rounded-lg px-3 py-1">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* SUBSCRIPTION PLANS - NEW DESIGN */}
          <Card className="rounded-xl shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Select a subscription plan to access exclusive advisory content
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {plans.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const activeSubs = 0; // You can calculate this if needed
                    
                    return (
                      <Card key={plan.id} className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 ${
                        plan.is_active ? 'border-2 border-purple-200' : 'border-2 border-gray-200 opacity-75'
                      }`}>
                        <div className={`p-6 text-center bg-gradient-to-br ${getPlanColor(plan.name)}`}>
                          <div className="text-4xl mb-2">
                            {getPlanIcon(plan.name)}
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">
                            {plan.name}
                          </h3>
                          
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-white">₹{plan.price?.toLocaleString() || 0}</span>
                            <span className="text-white/90 text-sm font-medium">/ {plan.billing_interval}</span>
                          </div>
                        </div>

                        <CardContent className="p-6">
                          {plan.description && (
                            <p className="text-sm text-slate-600 mb-4 text-center leading-relaxed">
                              {plan.description}
                            </p>
                          )}

                          {plan.monthly_post_limit && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                              <p className="text-xs text-slate-600 mb-1 text-center">Monthly Post Limit</p>
                              <p className="text-lg font-bold text-blue-600 text-center">
                                {plan.monthly_post_limit} Posts/Month
                              </p>
                            </div>
                          )}

                          {plan.features && plan.features.length > 0 && (
                            <div className="space-y-3 mb-6">
                              <p className="text-xs font-semibold text-slate-700 text-center uppercase tracking-wide">What's Included</p>
                              <ul className="space-y-2">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="pt-4 border-t">
                            {subscription?.plan_id === plan.id ? (
                              <Button disabled className="w-full" variant="secondary">
                                Currently Subscribed
                              </Button>
                            ) : (
                              <Button onClick={() => handlePlanSelect(plan)} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                Subscribe to {plan.name}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 text-slate-600">
                  No subscription plans available yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* ADVISORY POSTS */}
          <Card className="rounded-xl shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
              <CardTitle>Recent Advisory Posts</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {subscription ? (
                posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post.id} className="p-4 border-2 border-slate-200 rounded-xl bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-lg">{post.title}</h4>
                          <div className="flex items-center gap-2">
                            {getPostPlanBadge(post.required_plan_id)}
                            {post.view_count > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                {post.view_count} views
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {getRecommendationBadge(post)}
                        
                        <p className="text-sm text-slate-600 mt-2 mb-3">{post.content}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {post.stock_symbol && (
                            <Badge variant="outline" className="rounded-lg font-semibold">
                              {post.stock_symbol}
                            </Badge>
                          )}
                          {post.recommendation_type && (
                            <Badge className={
                              post.recommendation_type === 'buy' ? 'bg-green-100 text-green-800' :
                              post.recommendation_type === 'sell' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {post.recommendation_type.toUpperCase()}
                            </Badge>
                          )}
                          {post.target_price && (
                            <Badge variant="outline">
                              Target: ₹{post.target_price}
                            </Badge>
                          )}
                          {post.current_price && (
                            <Badge variant="outline" className="bg-blue-50">
                              Current: ₹{post.current_price.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-3">
                          Posted {format(new Date(post.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No posts available for your subscription plan yet.</p>
                )
              ) : (
                <div className="text-center p-8 bg-slate-100 rounded-xl">
                  <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">Content Locked</h3>
                  <p className="text-slate-600 mb-4">
                    Subscribe to one of the plans above to view exclusive advisory posts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* REVIEWS AT BOTTOM */}
          <Card className="rounded-xl shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Reviews & Ratings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Rating Distribution */}
              {reviews.length > 0 && (
                <div className="grid md:grid-cols-2 gap-8 pb-6 border-b">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-slate-800 mb-2">{averageRating}</div>
                    <div className="flex justify-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${star <= Math.round(averageRating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-600">Based on {reviews.length} reviews</p>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm w-8">{rating}★</span>
                        <Progress
                          value={reviews.length > 0 ? (ratingDistribution[rating - 1] / reviews.length) * 100 : 0}
                          className="flex-1 h-2"
                        />
                        <span className="text-sm w-8 text-slate-600 text-right">
                          {ratingDistribution[rating - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Form */}
              {canLeaveReview && (
                <ReviewForm
                  onSubmit={handleReviewSubmit}
                  existingReview={userReview}
                  advisorName={advisor.display_name}
                />
              )}

              {/* Review List */}
              <ReviewSection reviews={reviews} />
            </CardContent>
          </Card>
        </div>

        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={selectedPlan}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </ErrorBoundary>
  );
}