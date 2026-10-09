import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Solid-colour summary tile: label, figure, sub-label, and an icon in a
 * translucent disc on the right.
 *
 * One component for the dashboard and the portfolio so the two rows cannot
 * drift apart in height, padding or type scale — they previously used two
 * different hand-rolled layouts.
 *
 * Colour. Each tone is the AA-safe depth of a family already in the palette
 * (green from BUY, blue is --premium, purple is --primary, orange from HOLD),
 * never a new hue. The brand's bright green and orange carry white text at
 * 1.72:1 and 3.24:1, so they are not usable as a fill behind white; the deeper
 * values here measure 5.02, 6.44, 7.10 and 5.18 against white.
 *
 * Text is full white throughout, with the hierarchy coming from size and
 * weight rather than opacity. Dimming the label to 90% and the sub-label to
 * 75% looked right but measured 4.39:1 and 3.54:1 on the green fill — under
 * the 4.5:1 floor. Transparency is a contrast decision disguised as a styling
 * one, so it is not used on text here.
 *
 * Motion. The icon drifts slowly, lifts on hover, and the disc expands behind
 * it. Every one of those is wrapped in `motion-reduce:` so the tile is
 * completely still for anyone who has asked for reduced motion.
 */
const TONES = {
  green: "bg-tile-green",
  blue: "bg-tile-blue",
  purple: "bg-tile-purple",
  orange: "bg-tile-orange",
  ink: "bg-tile-ink",
};

export default function StatTile({
  title,
  value,
  sub,
  icon: Icon,
  tone = "purple",
  to = null,
  isLoading = false,
}) {
  const fill = TONES[tone] || TONES.purple;

  const body = (
    <CardContent className="relative flex min-h-[112px] items-center justify-between gap-3 p-5 sm:min-h-[124px] sm:p-6">
      {/* Decorative highlight, matching the soft glow in the reference.
          aria-hidden and pointer-events-none: it is texture, not content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-tile-foreground/10"
      />

      <div className="relative min-w-0">
        <p className="truncate text-sm font-semibold text-tile-foreground">{title}</p>

        {isLoading ? (
          <div className="mt-2 h-8 w-24 animate-pulse rounded bg-tile-foreground/20 motion-reduce:animate-none" />
        ) : (
          <p className="mt-1 text-3xl font-bold leading-tight text-tile-foreground tabular-nums">
            {value}
          </p>
        )}

        {sub && (
          <p className="mt-1 truncate text-xs font-medium text-tile-foreground">{sub}</p>
        )}
      </div>

      <span
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                   bg-tile-foreground/15 transition-all duration-300
                   group-hover:scale-110 group-hover:bg-tile-foreground/25
                   motion-reduce:transform-none motion-reduce:transition-none"
      >
        <Icon
          // `duration-300` is avoided here: alongside `animate-*` it also sets
          // animation-duration, which cut the 3.5s drift down to 0.3s and made
          // the icon twitch. The arbitrary value targets the transition only.
          className="h-6 w-6 text-tile-foreground animate-tile-float
                     transition-transform [transition-duration:300ms]
                     group-hover:-translate-y-0.5
                     motion-reduce:animate-none motion-reduce:transform-none
                     motion-reduce:transition-none"
        />
      </span>
    </CardContent>
  );

  const card = (
    <Card
      className={`group overflow-hidden rounded-xl border-0 shadow-sm ${fill}
                  transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg
                  motion-reduce:transform-none motion-reduce:transition-none`}
    >
      {body}
    </Card>
  );

  // Only wrap in a link when there is somewhere to go, so a static tile does
  // not advertise itself as clickable.
  return to ? (
    <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {card}
    </Link>
  ) : (
    card
  );
}
