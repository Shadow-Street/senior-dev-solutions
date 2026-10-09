import { Link } from "react-router-dom";
import { ArrowRight, Crown, Lock, Sparkles } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Top-of-room banner for premium / VIP chat rooms.
 *
 * Renders nothing for an ordinary room, so it is safe to mount unconditionally.
 * Tier wording comes from the room record (`premium_tier` / `required_plan`),
 * never from a hardcoded list, so adding a tier server-side needs no UI change.
 */
const TIERS = {
  vip: {
    label: "VIP Room",
    blurb: "Direct advisor access, priority signals and VIP-only discussion.",
    icon: Crown,
  },
  premium: {
    label: "Premium Room",
    blurb: "Expert insights and premium market discussion.",
    icon: Sparkles,
  },
  basic: {
    label: "Members Room",
    blurb: "Open to subscribed members.",
    icon: Sparkles,
  },
};

export default function VipRoomBanner({ room, hasAccess = true }) {
  const isPremium =
    Boolean(room?.is_premium) ||
    ["premium", "premium_admin"].includes(room?.room_type);

  if (!isPremium) return null;

  const tierKey = String(room?.premium_tier || room?.required_plan || "premium").toLowerCase();
  const tier = TIERS[tierKey] || TIERS.premium;
  const Icon = hasAccess ? tier.icon : Lock;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-premium-gradient px-4 py-3 text-white shadow-sm"
      role="note"
      aria-label={`${tier.label} — premium chat room`}
    >
      {/* Decorative glow; purely presentational. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10"
      />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold leading-tight">
            {tier.label}
            <span className="rounded-full bg-buy px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-buy-foreground">
              {tierKey}
            </span>
          </p>
          <p className="truncate text-xs text-white/80">
            {hasAccess ? tier.blurb : `Upgrade to ${tierKey.toUpperCase()} to join this room.`}
          </p>
        </div>

        {!hasAccess && (
          <Link
            to={createPageUrl("Subscription")}
            className="group/upgrade flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary
                       transition-all duration-200 hover:bg-protocall-premium-bg hover:shadow-md"
          >
            Upgrade
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/upgrade:translate-x-0.5 motion-reduce:transform-none" />
          </Link>
        )}
      </div>
    </div>
  );
}
