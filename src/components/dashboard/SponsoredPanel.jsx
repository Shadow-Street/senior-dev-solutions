import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Crown,
  LineChart,
  MessagesSquare,
  Radio,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import bullArt from "@/assets/dashboard/bull-cutout.webp";
import { renderBrandLogo } from "@/components/common/BrandLogo";

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
      className="group/card relative isolate h-full overflow-hidden border-0 bg-gradient-to-br from-protocall-sidebar-dark via-protocall-sidebar-bg to-protocall-deep
                 text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-protocall-blue/20
                 motion-reduce:transform-none motion-reduce:transition-none"
    >
      {/* Glow behind the artwork, purely presentational. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 bottom-6 -z-10 h-40 w-56 rounded-full bg-protocall-blue/35 blur-3xl"
      />

      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/85 ring-1 ring-inset ring-white/15">
            Sponsored
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
            {renderBrandLogo("h-5 w-5 transition-transform duration-500 group-hover/card:rotate-90 motion-reduce:transform-none")}
            Protocall
          </span>
        </div>

        <div className="mt-3 grid flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3">
          <div className="relative flex min-w-0 flex-col">
            <p className="text-lg font-extrabold uppercase leading-none tracking-tight sm:text-xl">Stock</p>
            <p className="bg-gradient-to-r from-protocall-light to-protocall-premium-light bg-clip-text text-xl font-extrabold uppercase leading-tight tracking-tight text-transparent sm:text-2xl">
              Protocall
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
              Trade · Discuss · Grow
            </p>
            <img
              src={bullArt}
              alt=""
              aria-hidden="true"
              className="pointer-events-none mt-auto w-full max-w-[220px] select-none object-contain pt-2 drop-shadow-[0_8px_18px_rgba(71,55,255,0.45)]
                         transition-transform duration-500 group-hover/card:scale-105 motion-reduce:transform-none"
            />
          </div>

          <ul className="flex flex-col justify-center gap-2.5">
            {FEATURES.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/90 transition-transform duration-200
                           hover:translate-x-0.5 motion-reduce:transform-none"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 ring-1 ring-inset ring-white/15">
                  <Icon className="h-3.5 w-3.5 text-protocall-premium-light" />
                </span>
                <span className="min-w-0 leading-tight">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          to={createPageUrl("Subscription")}
          className="group/cta mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-protocall-blue px-4 py-2.5
                     text-sm font-semibold text-white shadow-md shadow-protocall-blue/30 transition-all duration-200
                     hover:bg-protocall-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Learn More
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1 motion-reduce:transform-none" />
        </Link>
      </CardContent>
    </Card>
  );
}
