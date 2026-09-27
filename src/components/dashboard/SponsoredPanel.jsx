import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, Crosshair } from "lucide-react";
import { createPageUrl } from "@/utils";

const FEATURES = [
  "Live market data",
  "Expert insights",
  "Community polls",
  "Premium rooms",
  "Real-time updates",
];

export default function SponsoredPanel() {
  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-divider px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sponsored
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Crosshair className="h-3 w-3" />
            Protocall
          </span>
        </div>

        <div className="bg-premium-gradient p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
            Stock
          </p>
          <p className="text-2xl font-extrabold leading-none tracking-tight">PROTOCALL</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-protocall-premium-light">
            Trade · Discuss · Grow
          </p>

          <ul className="mt-4 space-y-1.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-white/90">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-buy">
                  <Check className="h-2.5 w-2.5 text-buy-foreground" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            to={createPageUrl("Subscription")}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-protocall-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-protocall-deep"
          >
            Learn More
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
