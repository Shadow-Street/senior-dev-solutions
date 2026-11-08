
import { useState, useEffect } from 'react';
import { authAPI, Advisor, AdvisorPlan, AdvisorSubscription, Review } from '@/lib/apiClient';
import { advisorApi } from '@/lib/advisorApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Star, Users, Lock, Shield, BarChart3, ArrowLeft } from 'lucide-react';
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
  const [postsError, setPostsError] = useState(false);
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
        const user = await authAPI.me().catch(() => {
          console.log('👤 Guest mode - no user logged in');
          return null;
        });

        if (!isMounted) return;
        setCurrentUser(user);
        console.log('✅ User loaded:', user?.email || 'Guest');

        // Load advisor data - CRITICAL
        const advisorData = await Advisor.get(advisorId);
        if (!isMounted) return;

        if (!advisorData) {
          throw new Error('Advisor not found');
        }

        setAdvisor(advisorData);
        console.log('✅ Advisor loaded:', advisorData.display_name);

        // Load plans
        try {
          const advisorPlans = await AdvisorPlan.filter({
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

        // Posts: the server decides what this viewer may read. Public posts
        // arrive in full; subscriber-only posts arrive as locked previews
        // (title only) unless the viewer has an active subscription.
        try {
          const feed = await advisorApi.feed(advisorId, { limit: 20 });
          if (isMounted) { setPosts(Array.isArray(feed) ? feed : []); setPostsError(false); }
        } catch (err) {
          console.warn('Posts loading failed:', err.message);
          if (isMounted) { setPosts([]); setPostsError(true); }
        }

        // Load reviews
        try {
          const advisorReviews = await Review.filter({
            entity_type: 'advisor',
            entity_id: advisorId,
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
            const userSub = await AdvisorSubscription.filter({
              user_id: user.id,
              advisor_id: advisorId,
              status: 'active'
            }, '', 1);

            if (isMounted) {
              if (userSub && userSub.length > 0) {
                setSubscription(userSub[0]);
              }

              // Check if user has already reviewed
              try {
                const existingReview = await Review.filter({
                  user_id: user.id,
                  entity_type: 'advisor',
                  entity_id: advisorId
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

  // Called after the server has verified the Razorpay signature and created the
  // subscription (POST /payments/verify). Nothing is created from the browser:
  // the AdvisorSubscription, the follower count and the advisor's commission are
  // all written by the server.
  const handlePaymentSuccess = async (plan, verifyData) => {
    if (!currentUser || !advisor) {
      toast.error("User or advisor information missing");
      return;
    }

    try {
      // Read the subscription back from the server rather than trusting the client.
      const [newSubscription] = (await AdvisorSubscription.filter({
        user_id: currentUser.id,
        advisor_id: advisor.id,
        status: 'active'
      }, '', 1)) || [];
      setSubscription(newSubscription || verifyData?.subscription || null);

      // The server unlocks whatever the new subscription entitles them to.
      setPosts(await advisorApi.feed(advisorId, { limit: 20 }));

      toast.success(`Payment received. You are now subscribed to ${advisor.display_name}.`);
    } catch (error) {
      console.error("❌ Loading the new subscription failed:", error);
      // The payment and subscription are already recorded server-side.
      toast.success(`Payment received. Your subscription to ${advisor.display_name} is active - refresh the page if it does not appear.`);
    } finally {
      setShowPaymentModal(false);
      setSelectedPlan(null);
    }
  };

  const handleReviewSubmit = async (rating, reviewText) => {
    if (!currentUser || !advisor) return;

    try {
      if (userReview) {
        await Review.update(userReview.id, {
          rating,
          content: reviewText
        });
        setUserReview({ ...userReview, rating, review: reviewText });
        toast.success("Review updated successfully!");
      } else {
        const newReview = await Review.create({
          entity_type: 'advisor',
          entity_id: advisor.id,
          user_id: currentUser.id,
          rating,
          content: reviewText,
          status: 'approved'
        });
        setUserReview(newReview);
        toast.success("Review submitted successfully!");
      }

      const updatedReviews = await Review.filter({
        entity_type: 'advisor',
        entity_id: advisorId,
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

  const getPlanColor = (planName) => {
    const name = planName?.toLowerCase();
    if (name?.includes('vip') || name?.includes('diamond') || name?.includes('gold')) {
      return 'from-hold to-hold';
    }
    if (name?.includes('premium') || name?.includes('pro') || name?.includes('plus')) {
      return 'from-protocall-deep to-protocall-blue';
    }
    if (name?.includes('basic') || name?.includes('starter') || name?.includes('momentum')) {
      return 'from-protocall-deep to-protocall-blue';
    }
    return 'from-protocall-deep to-protocall-blue';
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
      <div className="min-h-screen bg-surface-2 p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading advisor profile..." />
      </div>
    );
  }

  if (error || !advisor) {
    return (
      <div className="min-h-screen bg-surface-2 p-6">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl("Advisors")}>
            <Button variant="outline" className="mb-4 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Advisors
            </Button>
          </Link>
          <Card className="border-sell/30">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-sell-muted flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-sell-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {error || 'Advisor Not Found'}
              </h2>
              <p className="text-subtle mb-6">
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
      <div className="min-h-screen bg-surface-2 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <Link to={createPageUrl("Advisors")}>
            <Button variant="outline" className="mb-4 flex items-center gap-2 hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Advisors
            </Button>
          </Link>

          {/* PROFILE HEADER WITH RATING SUMMARY */}
          <Card className="overflow-hidden border-0 shadow-xl rounded-xl">
            <div className="bg-gradient-to-r from-protocall-deep via-protocall-grape to-protocall-blue h-32 rounded-t-xl" />
            <div className="p-8 flex flex-col md:flex-row items-start gap-8 -mt-16">
              <img
                src={advisor.profile_image_url || `https://avatar.vercel.sh/${advisor.display_name}.png`}
                alt={advisor.display_name}
                className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-2xl object-cover"
              />
              <div className="pt-16 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-foreground">{advisor.display_name}</h1>
                  <Badge className="bg-buy hover:bg-buy text-buy-foreground font-medium px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md">
                    <Shield className="w-4 h-4" />
                    SEBI Verified
                  </Badge>
                  {averageRating > 0 && (
                    <Badge variant="outline" className="bg-hold-muted border-hold/30 text-hold-muted-foreground font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm">
                      <Star className="w-4 h-4 fill-current text-hold" />
                      {averageRating}/5 ({reviews.length} reviews)
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-6 mb-4 text-sm text-subtle">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{advisor.follower_count || 0} Subscribers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>{advisor.success_rate ? `${advisor.success_rate}% Success Rate` : 'Success rate not available'}</span>
                  </div>
                  {advisor.sebi_registration_number && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      <span>SEBI {advisor.sebi_registration_number}</span>
                    </div>
                  )}
                </div>
                <p className="text-subtle leading-relaxed mb-4">{advisor.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {advisor.specialization?.map((spec) => (
                    <Badge key={spec} variant="secondary" className="bg-premium-muted text-primary rounded-lg px-3 py-1">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            </div >
          </Card >

          {/* SUBSCRIPTION PLANS - NEW DESIGN */}
          < Card className="rounded-xl shadow-lg" >
            <CardHeader className="border-b bg-surface-2">
              <CardTitle className="text-2xl">Choose Your Plan</CardTitle>
              <p className="text-sm text-subtle mt-1">
                Select a subscription plan to access exclusive advisory content
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {plans.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    return (
                      <Card key={plan.id} className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 ${plan.is_active ? 'border-2 border-protocall-premium-light' : 'border-2 border-border opacity-75'
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
                            <span className="text-white/90 text-sm font-medium">/ {{ monthly: 'month', quarterly: 'quarter', yearly: 'year' }[plan.billing_interval] || 'month'}</span>
                          </div>
                        </div>

                        <CardContent className="p-6">
                          {plan.description && (
                            <p className="text-sm text-subtle mb-4 text-center leading-relaxed">
                              {plan.description}
                            </p>
                          )}

                          {plan.features && plan.features.length > 0 && (
                            <div className="space-y-3 mb-6">
                              <p className="text-xs font-semibold text-subtle text-center uppercase tracking-wide">What's Included</p>
                              <ul className="space-y-2">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-subtle">
                                    <CheckCircle className="w-4 h-4 text-buy-muted-foreground flex-shrink-0 mt-0.5" />
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
                              <Button onClick={() => handlePlanSelect(plan)} className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue">
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
                <div className="text-center p-8 text-subtle">
                  No subscription plans available yet.
                </div>
              )}
            </CardContent>
          </Card >

          {/* ADVISORY POSTS */}
          < Card className="rounded-xl shadow-lg" >
            <CardHeader className="bg-surface-2 border-b">
              <CardTitle>Recent Advisory Posts</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {postsError ? (
                <p className="text-sell-muted-foreground text-center py-8">We could not load advisory posts. Please refresh the page.</p>
              ) : posts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No advisory posts have been published yet.</p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (post.locked ? (
                    <div key={post.id} className="p-4 border-2 border-dashed border-border rounded-xl bg-surface-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-lg flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground shrink-0" />{post.title}</h4>
                          <p className="text-sm text-subtle mt-1">
                            {post.required_plan_name
                              ? `Available to subscribers on the ${post.required_plan_name} plan and above.`
                              : 'Available to subscribers.'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(post.created_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={post.id} className="p-4 border-2 border-border rounded-xl bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <h4 className="font-semibold text-lg">{post.title}</h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {post.visibility === 'public' ? <><Users className="w-3 h-3 mr-1" />Public</> : <><Lock className="w-3 h-3 mr-1" />{post.required_plan_name ? `${post.required_plan_name}+` : 'Subscribers'}</>}
                        </Badge>
                      </div>
                      <p className="text-sm text-subtle mt-2 mb-3 whitespace-pre-line">{post.content}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {post.stock_symbol && <Badge variant="outline" className="rounded-lg font-semibold">{post.stock_symbol}</Badge>}
                        {post.recommendation_type && (
                          <Badge className={post.recommendation_type === 'buy' ? 'bg-buy-muted text-buy-muted-foreground' : post.recommendation_type === 'sell' ? 'bg-sell-muted text-sell-muted-foreground' : 'bg-hold-muted text-hold-muted-foreground'}>
                            {post.recommendation_type.toUpperCase()}
                          </Badge>
                        )}
                        {post.target_price && <Badge variant="outline">Target: ₹{Number(post.target_price)}</Badge>}
                        {post.stop_loss && <Badge variant="outline">Stop loss: ₹{Number(post.stop_loss)}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Posted {format(new Date(post.created_date), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  )))}
                  {!subscription && posts.some((p) => p.locked) && (
                    <p className="text-center text-sm text-subtle">Subscribe to one of the plans above to unlock subscriber-only advisories.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card >

          {/* REVIEWS AT BOTTOM */}
          < Card className="rounded-xl shadow-lg" >
            <CardHeader className="bg-surface-2 border-b">
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-hold" />
                Reviews & Ratings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Rating Distribution */}
              {reviews.length > 0 && (
                <div className="grid md:grid-cols-2 gap-8 pb-6 border-b">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-foreground mb-2">{averageRating}</div>
                    <div className="flex justify-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${star <= Math.round(averageRating) ? 'text-hold fill-current' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <p className="text-subtle">Based on {reviews.length} reviews</p>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm w-8">{rating}★</span>
                        <Progress
                          value={reviews.length > 0 ? (ratingDistribution[rating - 1] / reviews.length) * 100 : 0}
                          className="flex-1 h-2"
                        />
                        <span className="text-sm w-8 text-subtle text-right">
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
          </Card >
        </div >

        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={selectedPlan}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div >
    </ErrorBoundary >
  );
}