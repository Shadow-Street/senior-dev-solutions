import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function PostLimitTracker({ posts, plans }) {
  const [monthlyStats, setMonthlyStats] = useState({});
  const [totalThisMonth, setTotalThisMonth] = useState(0);

  useEffect(() => {
    calculateMonthlyStats();
  }, [posts, plans]);

  const calculateMonthlyStats = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Filter posts created this month
    const thisMonthPosts = posts.filter(post => {
      const postDate = new Date(post.created_date);
      return postDate >= monthStart && postDate <= monthEnd;
    });

    setTotalThisMonth(thisMonthPosts.length);

    // Calculate stats for each plan
    const stats = {};
    
    plans.forEach(plan => {
      // Count posts exclusive to this plan (not "All Subscribers" posts)
      const planPosts = thisMonthPosts.filter(post => post.required_plan_id === plan.id);
      
      stats[plan.id] = {
        plan_name: plan.name,
        monthly_limit: plan.monthly_post_limit,
        posts_this_month: planPosts.length,
        remaining: plan.monthly_post_limit ? plan.monthly_post_limit - planPosts.length : null,
        percentage: plan.monthly_post_limit ? (planPosts.length / plan.monthly_post_limit) * 100 : 0,
        is_unlimited: !plan.monthly_post_limit,
        is_over_limit: plan.monthly_post_limit && planPosts.length > plan.monthly_post_limit,
        is_near_limit: plan.monthly_post_limit && planPosts.length >= plan.monthly_post_limit * 0.8
      };
    });

    // Add stats for "All Subscribers" posts
    const allSubscribersPosts = thisMonthPosts.filter(post => !post.required_plan_id);
    stats['all'] = {
      plan_name: 'All Subscribers',
      posts_this_month: allSubscribersPosts.length,
      is_unlimited: true
    };

    setMonthlyStats(stats);
  };

  const getStatusIcon = (stat) => {
    if (stat.is_unlimited) return <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />;
    if (stat.is_over_limit) return <AlertCircle className="w-5 h-5 text-sell-muted-foreground" />;
    if (stat.is_near_limit) return <Clock className="w-5 h-5 text-hold-muted-foreground" />;
    return <CheckCircle className="w-5 h-5 text-protocall-blue" />;
  };

  const getProgressColor = (stat) => {
    if (stat.is_unlimited) return 'bg-buy';
    if (stat.is_over_limit) return 'bg-sell';
    if (stat.is_near_limit) return 'bg-hold';
    return 'bg-protocall-blue';
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-surface-2">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-protocall-premium-text" />
          Monthly Post Tracker - {format(new Date(), 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* ✅ Show info if no posts this month */}
        {totalThisMonth === 0 && posts.length > 0 && (
          <div className="mb-6 bg-premium-muted border border-protocall-premium-light rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-protocall-blue flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-protocall-blue">No posts created this month yet</p>
                <p className="text-xs text-protocall-blue mt-1">
                  You have {posts.length} total post{posts.length !== 1 ? 's' : ''} from previous months. 
                  This tracker shows only posts created in {format(new Date(), 'MMMM yyyy')}.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(monthlyStats).map(([key, stat]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(stat)}
                  <div>
                    <h4 className="font-semibold text-foreground">{stat.plan_name}</h4>
                    {stat.is_unlimited ? (
                      <p className="text-sm text-subtle">
                        Unlimited posts • {stat.posts_this_month} created this month
                      </p>
                    ) : (
                      <p className="text-sm text-subtle">
                        {stat.posts_this_month} / {stat.monthly_limit} posts
                        {stat.remaining !== null && stat.remaining >= 0 && (
                          <span className="ml-2 text-protocall-blue font-medium">
                            ({stat.remaining} remaining)
                          </span>
                        )}
                        {stat.is_over_limit && (
                          <span className="ml-2 text-sell-muted-foreground font-medium">
                            ({Math.abs(stat.remaining)} over limit!)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                
                {!stat.is_unlimited && (
                  <Badge className={
                    stat.is_over_limit ? 'bg-sell-muted text-sell-muted-foreground' :
                    stat.is_near_limit ? 'bg-hold-muted text-hold-muted-foreground' :
                    'bg-premium-muted text-protocall-blue'
                  }>
                    {Math.round(stat.percentage)}%
                  </Badge>
                )}
              </div>

              {!stat.is_unlimited && (
                <div className="space-y-2">
                  <Progress 
                    value={Math.min(stat.percentage, 100)} 
                    className="h-3"
                    indicatorClassName={getProgressColor(stat)}
                  />
                  {stat.is_over_limit && (
                    <div className="flex items-start gap-2 text-xs text-sell-muted-foreground bg-sell-muted p-2 rounded">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>You've exceeded your commitment of {stat.monthly_limit} posts for {stat.plan_name} this month.</p>
                    </div>
                  )}
                  {stat.is_near_limit && !stat.is_over_limit && (
                    <div className="flex items-start gap-2 text-xs text-hold-muted-foreground bg-hold-muted p-2 rounded">
                      <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>You're approaching your limit of {stat.monthly_limit} posts for {stat.plan_name}.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Monthly Summary */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-subtle" />
                <span className="font-semibold text-foreground">Total Posts This Month</span>
              </div>
              <Badge className="bg-premium-muted text-protocall-premium-text text-lg px-4 py-2">
                {totalThisMonth}
              </Badge>
            </div>
            {totalThisMonth === 0 && posts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ All your {posts.length} posts were created in previous months
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}