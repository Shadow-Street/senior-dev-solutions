import { Link } from "react-router-dom";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";
import authBanner from "@/assets/brand/auth-banner.webp";
import chartBackdrop from "@/assets/home/chart-backdrop.webp";

/**
 * Shared frame for the signed-out pages: sign in, sign up, forgot password,
 * reset password.
 *
 * Styled with the public Home page's tokens (home-night / home-cream / brand
 * purple, Plus Jakarta Sans) so leaving /home for /login feels like one site.
 * The brand panel is the purple chart backdrop with the PROTOCALL
 * bull-vs-bear banner on top — the banner already carries the logo, wordmark
 * and "TRADE / LEARN / CONNECT / GROW", so no separate lockup is drawn.
 *
 * Layout. Two columns from `lg` up. Below that the panel is dropped so the form
 * starts near the top, and the banner shrinks into a strip above the form.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen w-full bg-home-cream font-display">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        <aside className="relative isolate hidden overflow-hidden bg-home-night lg:flex lg:flex-col lg:gap-10 lg:p-12">
          <img
            src={chartBackdrop}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[70%_50%]"
          />
          {/* Scrim: darkest behind the copy at the top, letting the chart
              show through lower down. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-home-night via-home-night/80 to-home-night/20"
          />
          <div className="pointer-events-none absolute -left-24 -top-32 -z-10 h-80 w-80 rounded-full bg-home-brand opacity-30 blur-3xl" />

          <Link
            to="/home"
            className="relative block overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 transition-transform duration-300 hover:-translate-y-0.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700"
          >
            <img
              src={authBanner}
              alt="Protocall — trade, learn, connect, grow"
              className="block aspect-[2000/733] w-full object-cover"
            />
          </Link>

          <div className="relative space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000">
            <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight text-white text-balance">
              India&rsquo;s retail investor community, in one place.
            </h2>
            <ul className="space-y-4">
              {[
                { icon: TrendingUp, text: "Live market data and stock chat rooms" },
                { icon: Users, text: "Community polls and SEBI-registered advisors" },
                { icon: ShieldCheck, text: "Verified advisors and moderated discussion" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-home-lime/40">
                    <Icon className="h-4 w-4 text-home-lime" />
                  </span>
                  {/* Full white, not an opacity: dimmed text over the artwork
                      drops below the 4.5:1 contrast floor. */}
                  <span className="pt-1 text-sm font-semibold text-white">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-auto text-xs font-medium text-white/80">
            &copy; {new Date().getFullYear()} Protocall. Investments are subject to market risk.
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            {/* Banner strip for the single-column layout. */}
            <Link
              to="/home"
              className="mb-6 block overflow-hidden rounded-2xl border border-home-line shadow-sm lg:hidden"
            >
              <img
                src={authBanner}
                alt="Protocall — trade, learn, connect, grow"
                className="block aspect-[2000/733] w-full object-cover"
              />
            </Link>

            <div className="rounded-2xl border border-home-line bg-white p-6 shadow-sm sm:p-8">
              <header className="mb-6 space-y-1.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-home-ink text-balance">
                  {title}
                </h1>
                {subtitle && <p className="text-sm text-home-muted">{subtitle}</p>}
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
