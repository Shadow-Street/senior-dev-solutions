
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const INTERVAL_LABEL = { month: 'month', quarter: 'quarter', year: 'year' };

/**
 * Directory card for one approved advisor.
 *
 * Rating, review count and the starting price come from the directory
 * endpoint (GET /api/advisors), which derives them from real reviews and the
 * advisor's active plans. This card used to show a fabricated "₹999 / month"
 * and no rating because its own lookups were stubbed out, and its Subscribe
 * button called a prop the page never passed. Subscribing happens on the
 * profile page (plan choice + checkout), so the card simply links there.
 */
function renderAdvisorCard(advisor, isSubscribed) {
  const name = advisor.display_name || advisor.name || 'Advisor';
  const bio = advisor.bio && advisor.bio.length > 120 ? `${advisor.bio.substring(0, 120)}...` : advisor.bio || 'Professional stock market advisor';
  const rating = Number(advisor.avg_rating || 0);
  const reviews = Number(advisor.review_count || 0);
  const hasPrice = advisor.starting_price !== null && advisor.starting_price !== undefined;
  const profileUrl = createPageUrl(`AdvisorProfile?id=${advisor.id}`);
  const image = advisor.profile_image_url || advisor.avatar_url;

  return (
    <Card className="flex flex-col hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden bg-white border border-border">
      <CardHeader className="text-center p-6 bg-surface-2 rounded-t-xl">
        <div className="flex justify-center mb-4">
          {image ? (
            <img src={image} alt={name} className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-primary text-white flex items-center justify-center text-3xl font-bold" aria-hidden="true">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <CardTitle className="text-xl font-bold text-foreground">{name}</CardTitle>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge className="bg-buy hover:bg-buy text-buy-foreground text-xs font-medium px-3 py-1 rounded-xl flex items-center gap-1 shadow-md">
              <Shield className="w-3 h-3" />
              SEBI Verified
            </Badge>
            {rating > 0 && (
              <Badge variant="outline" className="bg-hold-muted border-hold/30 text-hold-muted-foreground text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                <Star className="w-3 h-3 fill-protocall-neon text-protocall-neon-edge" />
                {rating}/5
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex-1 space-y-4">
        <p className="text-sm text-subtle text-center leading-relaxed">{bio}</p>

        <div className="flex flex-wrap gap-2 justify-center">
          {(Array.isArray(advisor.specialization) ? advisor.specialization : []).slice(0, 3).map((spec) => (
            <Badge key={spec} variant="secondary" className="text-xs bg-premium-muted text-primary rounded-lg px-2 py-1">
              {spec}
            </Badge>
          ))}
        </div>

        <div className="flex justify-around pt-4 border-t border-divider">
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{advisor.follower_count || 0}</p>
            <p className="text-xs text-muted-foreground">Subscribers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{reviews}</p>
            <p className="text-xs text-muted-foreground">Reviews</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{advisor.success_rate ? `${advisor.success_rate}%` : 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 p-6 bg-surface-2 rounded-b-xl">
        <div className="text-center">
          {hasPrice ? (
            <>
              <span className="text-xs text-muted-foreground mr-1">From</span>
              <span className="text-2xl font-bold text-foreground">₹{Number(advisor.starting_price).toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">/ {INTERVAL_LABEL[advisor.plan_interval] || 'month'}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No plans published yet</span>
          )}
        </div>
        <Link to={profileUrl} className="w-full">
          <Button className="w-full h-10 rounded-xl font-semibold text-sm">
            {isSubscribed ? (<><CheckCircle className="w-4 h-4 mr-2" />Subscribed - view profile</>) : 'View profile & plans'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function AdvisorCard({ advisor, userSubscriptions }) {
  const isSubscribed = Array.isArray(userSubscriptions) && userSubscriptions.some((sub) => sub.advisor_id === advisor.id);
  return renderAdvisorCard(advisor, isSubscribed);
}
