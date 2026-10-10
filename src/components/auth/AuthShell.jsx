import { Link } from "react-router-dom";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";

/**
 * Shared frame for the signed-out pages: sign in, sign up, forgot password,
 * reset password.
 *
 * The four pages previously each floated a plain white card on the cream page
 * background with no branding at all, and each had drifted to slightly
 * different spacing and type. One shell keeps them identical and puts the
 * product's own identity on screen: Cyber Grape (--primary) carries the brand
 * panel, which is the palette already in index.css rather than a new colour.
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
        <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/5"
          />

          <Link to="/landing" className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-6 w-6 text-white" />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-white">PROTOCALL</span>
              <span className="block text-xs font-medium tracking-wide text-white/80">
                FINANCIAL NETWORKING
              </span>
            </span>
          </Link>

          <div className="relative space-y-8">
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
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  {/* Full white, not an opacity: dimmed text on this fill drops
                      below the 4.5:1 contrast floor. */}
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
              to="/landing"
              className="mb-8 flex items-center justify-center gap-2 lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
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
