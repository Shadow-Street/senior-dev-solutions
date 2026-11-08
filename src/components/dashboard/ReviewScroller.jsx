import React from 'react';
import { Card } from '@/components/ui/card';
import { Star, Facebook, Linkedin, Twitter, Instagram, Youtube } from 'lucide-react';
import { renderMarqueeRow } from '@/components/common/Marquee';
import { NEON_STAR, renderRatingStars } from '@/components/common/RatingStars';

const iconMap = {
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
};

// Static sample reviews - NO DATABASE CALLS
const sampleReviews = [
  {
    id: '1',
    username: 'Amit Patel',
    rating: 5,
    review_text: 'Best platform for retail investors in India! The SEBI-registered advisors provide genuine insights, and the chat rooms are incredibly helpful.',
    social_platform: 'facebook',
  },
  {
    id: '2',
    username: 'Vikram Singh',
    rating: 5,
    review_text: 'The events and webinars are top-notch. Learning from industry experts has significantly improved my trading strategy. Thank you Protocall!',
    social_platform: 'linkedin',
  },
  {
    id: '3',
    username: 'Rohit Gupta',
    rating: 5,
    review_text: "Protocall's portfolio tracking and alerts have saved me from potential losses multiple times. The platform is intuitive and powerful!",
    social_platform: 'twitter',
  },
  {
    id: '4',
    username: 'Rajesh Kumar',
    rating: 5,
    review_text: 'Protocall has transformed my trading experience. The community insights are invaluable!',
    social_platform: 'linkedin',
  },
  {
    id: '5',
    username: 'Anjali Joshi',
    rating: 5,
    review_text: 'Great platform for beginners! The community is supportive, advisors are genuine, and the educational content is excellent. 5 stars!',
    social_platform: 'instagram',
  },
  {
    id: '6',
    username: 'Priya Sharma',
    rating: 5,
    review_text: 'Best platform for retail investors. Love the pledge pool feature and advisor recommendations.',
    social_platform: 'twitter',
  },
  {
    id: '7',
    username: 'Sneha Reddy',
    rating: 4,
    review_text: "I've tried many trading platforms, but Protocall stands out with its community-driven approach. The real-time polls help gauge market sentiment.",
    social_platform: 'instagram',
  },
  {
    id: '8',
    username: 'Kavita Mehta',
    rating: 5,
    review_text: 'Finally, a platform built for retail investors! The trust scores and advisor validation make me feel confident about my decisions.',
    social_platform: 'linkedin',
  },
];

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

const ReviewCard = ({ review }) => {
  const SocialIcon = review.social_platform ? iconMap[review.social_platform] : null;

  return (
    <Card className="relative flex h-[180px] w-[320px] shrink-0 flex-col border border-premium-light/60 bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:w-[350px]">
      <div className="mb-3 flex items-start gap-3">
        {/* Initials disc rendered locally: no third-party avatar service is
            sent members' names. */}
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-protocall-blue to-protocall-deep text-sm font-bold text-white ring-2 ring-premium-light"
        >
          {initials(review.username)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{review.username}</p>
          {/* Same stars as the Home page reviews (RatingStars). */}
          <div className="mt-1">{renderRatingStars(review.rating)}</div>
        </div>

        {SocialIcon && (
          <SocialIcon size={18} aria-hidden="true" className="shrink-0 text-subtle" />
        )}
      </div>

      <p className="line-clamp-3 text-sm italic leading-relaxed text-subtle">
        &ldquo;{review.review_text}&rdquo;
      </p>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 right-3 font-serif text-5xl leading-none text-premium-light"
      >
        &rdquo;
      </span>
    </Card>
  );
};

export default function ReviewScroller() {
  const half = Math.ceil(sampleReviews.length / 2);
  const firstRow = sampleReviews.slice(0, half);
  const secondRow = sampleReviews.slice(half);

  return (
    <section className="w-full pt-4 sm:pt-6" aria-labelledby="member-reviews-heading">
      <h2
        id="member-reviews-heading"
        className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl"
      >
        <Star className={`h-7 w-7 ${NEON_STAR}`} strokeWidth={1.75} aria-hidden="true" />
        What Our Members Are Saying
      </h2>

      <div className="space-y-3">
        {renderMarqueeRow({
          items: firstRow,
          renderItem: (review) => <ReviewCard review={review} />,
          keyOf: (review) => review.id,
          direction: 'left',
          label: 'Member reviews, row one',
          // Two runs keep the row wider than the widest Dashboard column
          // (~1630px); 140s keeps the speed of the former single run at 70s.
          copies: 2,
          durationSeconds: 140,
        })}
        {renderMarqueeRow({
          items: secondRow,
          renderItem: (review) => <ReviewCard review={review} />,
          keyOf: (review) => review.id,
          direction: 'right',
          label: 'Member reviews, row two',
          copies: 2,
          durationSeconds: 140,
        })}
      </div>
    </section>
  );
}
