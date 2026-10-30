import { Link } from "react-router-dom";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";
import { renderBrandLogo } from "@/components/common/BrandLogo";
import authArt from "@/assets/brand/auth-bull-bear.webp";

/**
 * Shared frame for the signed-out pages: sign in, sign up, forgot password,
 * reset password.
 *
 * The four pages previously each floated a plain white card on the cream page
 * background with no branding at all, and each had drifted to slightly
 * different spacing and type. One shell keeps them identical and puts the
 * product's own identity on screen: the brand panel carries the PROTOCALL
 * bull-vs-bear artwork on its own deep-navy field.
 *
 * Layout. Two columns from `lg` up, single column below, with the brand panel
 * dropping away on small screens so the form starts at the top of the viewport
 * rather than below a tall banner.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Brand panel — decorative, so it is hidden rather than stacked on
            phones, where it would push the form below the fold. */}
        <aside className="relative isolate hidden overflow-hidden bg-[#03023F] lg:flex lg:flex-col lg:gap-8 lg:p-12">
          {/* Bull-vs-bear brand artwork fills the panel; the scrims top and
              bottom keep the white copy above 4.5:1 wherever it lands. */}
          <img
            src={authArt}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[72%] w-full select-none object-cover object-[52%_55%]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#03023F]/90 from-0% via-[#03023F]/0 via-35% to-[#03023F] to-80%"
          />

          <Link to="/home" className="relative flex items-center gap-3">
            {renderBrandLogo("h-11 w-11")}
            <span>
              <span className="block text-lg font-bold tracking-tight text-white">PROTOCALL</span>
              <span className="block text-xs font-medium tracking-[0.2em] text-white/85">
                TRADE / LEARN / CONNECT / GROW
              </span>
            </span>
          </Link>

          <div className="relative mt-auto space-y-8">
            <h2 className="max-w-sm text-3xl font-bold leading-tight text-white text-balance">
              India&rsquo;s retail investor community, in one place.
            </h2>
            <ul className="space-y-4">
              {[
                { icon: TrendingUp, text: "Live market data and stock chat rooms" },
                { icon: Users, text: "Community polls and SEBI-registered advisors" },
                { icon: ShieldCheck, text: "Verified advisors and moderated discussion" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-buy/40">
                    <Icon className="h-4 w-4 text-buy" />
                  </span>
                  {/* Full white, not an opacity: dimmed text over the artwork
                      drops below the 4.5:1 contrast floor. */}
                  <span className="text-sm font-medium text-white">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs font-medium text-white/80">
            &copy; {new Date().getFullYear()} Protocall. Investments are subject to market risk.
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            {/* Compact brand lockup for the single-column layout. */}
            <Link
              to="/home"
              className="mb-8 flex items-center justify-center gap-2 lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-protocall-deep">
                {renderBrandLogo("h-7 w-7")}
              </span>
              <span className="text-base font-bold tracking-tight text-foreground">PROTOCALL</span>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <header className="mb-6 space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                  {title}
                </h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </header>

              {children}
            </div>

            {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
