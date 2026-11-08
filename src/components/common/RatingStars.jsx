import { Star } from "lucide-react";

/*
 * Member-review stars, shared by the Home page and the Dashboard so both read
 * the same: NEON LIME #D7FF00 fill with an olive outline (protocall-neon-edge),
 * which keeps the star visible on white where the fill alone is ~1.1:1.
 */
export const NEON_STAR = "fill-protocall-neon text-protocall-neon-edge";
const EMPTY_STAR = "fill-transparent text-divider";

export function renderRatingStars(rating, className = "h-4 w-4") {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} aria-hidden="true" className={`${className} ${i < value ? NEON_STAR : EMPTY_STAR}`} />
      ))}
    </div>
  );
}
