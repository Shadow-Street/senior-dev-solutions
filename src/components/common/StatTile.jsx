import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Solid-colour summary tile: label, figure, sub-label, and an icon in a
 * translucent disc on the right.
 *
 * One component for the dashboard and the portfolio so the two rows cannot
 * drift apart in height, padding or type scale — they previously used two
 * different hand-rolled layouts.
 *
 * Colour. Blue, purple and orange are the AA-safe depth of a family already in
 * the palette (blue is --premium, purple is --primary, orange from HOLD) and
 * measure 6.44, 7.10 and 5.18 against white. Green is the spec's Neon Lime
 * fill with #101018 ink text (16.4:1) rather than white.
 *
 * Text is full-strength throughout, with the hierarchy coming from size and
 * weight rather than opacity. Dimming the label to 90% and the sub-label to
 * 75% looked right but measured 4.39:1 and 3.54:1 on the old green fill —
 * under the 4.5:1 floor. Transparency is a contrast decision disguised as a styling
 * one, so it is not used on text here.
 *
 * Motion. The icon drifts slowly, lifts on hover, and the disc expands behind
 * it. Every one of those is wrapped in `motion-reduce:` so the tile is
 * completely still for anyone who has asked for reduced motion.
 */
// Green is the spec's Neon Lime (#D7FF00), which is unreadable under white
// (1.15:1). The tile swaps its foreground variable to #101018 ink instead, so
// every `tile-foreground` text and translucent disc below follows (16.4:1).
const TONES = {
  green: "bg-buy [--tile-foreground:240_20%_7.8%]",
  blue: "bg-tile-blue",
  purple: "bg-tile-purple",
  orange: "bg-tile-orange",
  ink: "bg-tile-ink",
};

/**
 * `variant="card"` is the dashboard treatment from the PROTOCALL reference: a
 * white card with a brand-blue icon disc and a chevron. `highlight` turns one
 * tile into the lime growth tile. Lime is a fill only here — the copy on it is
 * --buy-foreground ink (10.98:1), never white.
 */
function CardTileBody({ title, value, sub, icon: Icon, highlight, isLoading }) {
  return (
    <CardContent className="relative flex min-h-[104px] items-start gap-3.5 p-4 sm:p-5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300
                    group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none ${
                      highlight
                        ? "bg-buy-foreground text-buy"
                        : "bg-gradient-to-br from-protocall-blue to-protocall-deep text-white shadow-md shadow-protocall-blue/25"
                    }`}
      >
        <Icon
          className="h-5 w-5 animate-tile-float motion-reduce:animate-none"
          strokeWidth={2.25}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${highlight ? "text-buy-foreground" : "text-foreground"}`}>
          {title}
        </p>

        {isLoading ? (
          <div
            className={`mt-1.5 h-7 w-20 animate-pulse rounded motion-reduce:animate-none ${
              highlight ? "bg-buy-foreground/15" : "bg-surface-2"
            }`}
          />
        ) : (
          <p
            className={`mt-0.5 text-2xl font-bold leading-tight tabular-nums ${
              highlight ? "text-buy-foreground" : "text-foreground"
            }`}
          >
            {value}
          </p>
        )}

        {sub && (
          <p
            className={`mt-0.5 truncate text-xs font-medium ${
              highlight ? "text-buy-foreground" : "text-muted-foreground"
            }`}
          >
            {sub}
          </p>
        )}
      </div>

      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-200
                    group-hover:translate-x-0.5 motion-reduce:transform-none ${
                      highlight
                        ? "bg-buy-foreground/10 text-buy-foreground"
                        : "bg-premium-muted text-premium-muted-foreground"
                    }`}
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </CardContent>
  );
}

export default function StatTile({
  title,
  value,
  sub,
  icon: Icon,
  tone = "purple",
  to = null,
  isLoading = false,
  variant = "solid",
  highlight = false,
}) {
  const fill = TONES[tone] || TONES.purple;
  const isCard = variant === "card";

  const body = isCard ? (
    <CardTileBody
      title={title}
      value={value}
      sub={sub}
      icon={Icon}
      highlight={highlight}
      isLoading={isLoading}
    />
  ) : (
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

  const surface = !isCard
    ? `border-0 ${fill}`
    : highlight
      ? "border-0 bg-gradient-to-br from-buy to-buy-soft"
      : "border border-border bg-card";

  const card = (
    <Card
      className={`group overflow-hidden rounded-xl shadow-sm ${surface}
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
