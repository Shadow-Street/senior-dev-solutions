import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Check,
  Crosshair,
  Crown,
  LineChart,
  MessagesSquare,
  Radio,
} from "lucide-react";
import { createPageUrl } from "@/utils";

// Each feature carries its own icon so the card reads as a product summary
// rather than a plain list (§2: animated icons on cards).
const FEATURES = [
  { label: "Live market data", icon: LineChart },
  { label: "Expert insights", icon: BarChart3 },
  { label: "Community polls", icon: MessagesSquare },
  { label: "Premium rooms", icon: Crown },
  { label: "Real-time updates", icon: Radio },
];

export default function SponsoredPanel() {
  return (
    <Card
      className="group/card overflow-hidden border border-border bg-card shadow-sm transition-all duration-300
                 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10
                 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-divider px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sponsored
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Crosshair className="h-3 w-3 transition-transform duration-500 group-hover/card:rotate-90 motion-reduce:transform-none" />
            Protocall
          </span>
        </div>

        {/* Cyber Grape gradient treatment, matching the reference site's
            right-rail promo card. */}
        <div className="relative overflow-hidden bg-premium-gradient p-5 text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10
                       transition-transform duration-500 group-hover/card:scale-125 motion-reduce:transform-none"
          />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
              Stock
            </p>
            <p className="text-2xl font-extrabold leading-none tracking-tight">PROTOCALL</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-protocall-premium-light">
              Trade · Discuss · Grow
            </p>

            <ul className="mt-4 space-y-1.5">
              {FEATURES.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-xs text-white/90 transition-transform duration-200
                             hover:translate-x-0.5 motion-reduce:transform-none"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-buy">
                    <Check className="h-2.5 w-2.5 text-buy-foreground" strokeWidth={3} />
                  </span>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-protocall-premium-light" />
                  {label}
                </li>
              ))}
            </ul>

            {/* White button on the grape gradient — §1 asks for white button
                surfaces, and white-on-grape is the strongest contrast here. */}
            <Link
              to={createPageUrl("Subscription")}
              className="group/cta mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5
                         text-sm font-semibold text-primary shadow-sm transition-all duration-200
                         hover:bg-protocall-premium-bg hover:shadow-md"
            >
              Learn More
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1 motion-reduce:transform-none" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
