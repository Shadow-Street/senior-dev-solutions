import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Flame,
  Mail,
  MapPin,
  Menu,
  MessagesSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Vote,
  X,
} from "lucide-react";
import heroBull from "@/assets/home/hero-green-bull.webp";
import emblemDark from "@/assets/home/emblem-dark.webp";
import emblemLight from "@/assets/home/emblem-light.webp";
import footerBackdrop from "@/assets/home/footer-bg.webp";
import { renderMarqueeRow } from "@/components/common/Marquee";
import { renderRatingStars } from "@/components/common/RatingStars";
import ProtoGuide from "./ProtoGuide";
import {
  HOME_ABOUT,
  HOME_FEATURES,
  HOME_FOOTER_COLUMNS,
  HOME_LEGAL_LINKS,
  HOME_MEMBERSHIP,
  HOME_NAV,
  HOME_REVIEWS,
  HOME_ROOM_TYPE_LABELS,
  HOME_SOCIAL,
  HOME_STEPS,
} from "./homeContent";

/*
 * Sections of the public Home page, rebuilt from protocall.in/home.
 *
 * Class lists follow the reference markup one-to-one; the reference's tokens
 * map onto the `home-*` namespace in tailwind.config.js (bg-brand ->
 * bg-home-brand, text-inkmuted -> text-home-muted, border-line ->
 * border-home-line, ...).
 *
 * Render helpers rather than components with props, following the codebase's
 * no-propTypes style. Stateful parts live in HomeExperts.jsx and ProtoGuide.jsx.
 */

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-brand";
const FOCUS_ON_NIGHT = `${FOCUS} focus-visible:ring-offset-2 focus-visible:ring-offset-home-night`;
const NAV_LINK = `px-3 py-2 rounded-lg text-sm font-semibold text-home-muted hover:text-home-ink hover:bg-home-tint transition-colors ${FOCUS}`;
const PRIMARY_BTN = `inline-flex items-center justify-center gap-2 rounded-xl bg-home-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-home-brand/90 ${FOCUS} focus-visible:ring-offset-2`;
const FOOTER_LINK = `text-sm text-white/60 transition-colors hover:text-white ${FOCUS_ON_NIGHT} rounded`;

const EYEBROW = "text-xs font-bold uppercase tracking-[0.2em] text-home-brand";
const H2 = "mt-3 font-display text-3xl font-extrabold tracking-tight text-home-ink sm:text-4xl";
const CONTAINER = "mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24";

const fmtCount = (n, loading) => (loading ? "…" : n.toLocaleString("en-IN"));

function renderNavItem(item, className, onNavigate) {
  return item.href ? (
    <a key={item.label} href={item.href} className={className} onClick={onNavigate}>
      {item.label}
    </a>
  ) : (
    <Link key={item.label} to={item.to} className={className} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}

function renderSectionHeading(eyebrow, title, body) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className={H2}>{title}</h2>
      {body && <p className="mt-4 text-base leading-relaxed text-home-muted">{body}</p>}
    </div>
  );
}

function renderIconTile(Icon, className = "h-10 w-10 bg-home-tint text-home-brand") {
  return (
    <div className={`flex items-center justify-center rounded-xl ${className}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ header */

export function renderHomeHeader({ menuOpen, onToggleMenu, onCloseMenu, onLogin, onDashboard }) {
  return (
    <header className="sticky top-0 z-50 border-b border-home-line bg-home-cream">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/home" className="flex shrink-0 items-center gap-2.5" aria-label="Protocall home">
            <img src={emblemDark} alt="Protocall logo" className="h-9 w-9 shrink-0 object-contain" />
            <span className="font-display text-lg font-extrabold tracking-tight text-home-ink sm:text-xl">PROTOCALL</span>
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
            {HOME_NAV.map((item) => renderNavItem(item, NAV_LINK))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={onLogin}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold text-home-ink transition-colors hover:bg-home-tint ${FOCUS}`}
            >
              Login
            </button>
            <button type="button" onClick={onDashboard} className={PRIMARY_BTN}>
              Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-home-ink transition-colors hover:bg-home-tint lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-home-line bg-home-cream px-5 pb-5 pt-3 lg:hidden">
          <div className="flex flex-col gap-0.5">{HOME_NAV.map((item) => renderNavItem(item, NAV_LINK, onCloseMenu))}</div>
          <div className="mt-4 flex flex-col gap-2 border-t border-home-line pt-4">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-xl border border-home-line bg-white px-4 py-3 text-sm font-bold text-home-ink"
            >
              Login
            </button>
            <button type="button" onClick={onDashboard} className={`${PRIMARY_BTN} py-3`}>
              Dashboard
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

// The reference's illustrative candles: alternating up/down, drifting upward.
const CANDLES = [
  [58, 89.2, 65.2, 19.2], [60.4, 78.4, 65.2, 8.4], [52, 76, 56.8, 16.8], [49.6, 67.6, 56.8, 6],
  [40, 65.2, 44.8, 18], [37.6, 58, 44.8, 8.4], [30.4, 55.6, 35.2, 18], [28, 47.2, 35.2, 7.2],
  [20.8, 44.8, 25.6, 16.8], [18.4, 38.8, 25.6, 8.4], [17.2, 36.4, 22, 12], [14.8, 34, 22, 7.2],
];

function renderCandles() {
  return (
    <svg viewBox="0 0 320 140" className="h-28 w-full" role="img" aria-label="Illustrative candlestick chart">
      {CANDLES.map(([y1, y2, y, h], i) => {
        const up = i % 2 === 0;
        const x = 22 + i * 25;
        return (
          <g key={x}>
            <line x1={x} x2={x} y1={y1} y2={y2} className={up ? "stroke-home-neon" : "stroke-home-bear"} strokeWidth="1.5" />
            <rect x={x - 6} y={y} width="12" height={h} rx="1.5" className={up ? "fill-home-neon" : "fill-home-bear"} />
          </g>
        );
      })}
    </svg>
  );
}

export function renderHomeHero(data, onGetStarted) {
  return (
    <section className="relative w-full overflow-hidden bg-home-night text-white">
      <img
        src={heroBull}
        alt="Stylised green bull charging through rising candlestick charts on a deep purple gradient"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-60 sm:opacity-80 lg:object-right lg:opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-home-night/95 via-home-night/90 to-home-night/85 lg:bg-gradient-to-r lg:from-home-night lg:via-home-night/85 lg:to-home-night/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-home-night/80 via-transparent to-transparent lg:from-home-night/60" />
      <div className="pointer-events-none absolute -left-24 -top-40 h-96 w-96 rounded-full bg-home-brand opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-home-royal opacity-30 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-9 sm:gap-12 sm:px-8 sm:pt-14 lg:grid-cols-2 lg:gap-10 lg:pb-24 lg:pt-24">
        <div>
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white sm:mt-6 sm:px-3.5 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-home-neon" aria-hidden="true" />
            A community for Indian retail investors
          </span>
          <h1 className="mt-5 font-display text-[1.75rem] font-extrabold leading-[1.15] tracking-tight sm:mt-6 sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            Invest Smarter.
            <br />
            Discuss Better.
            <br />
            <span className="text-home-neon">Grow Together.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/75 sm:mt-6 sm:text-base lg:text-lg">
            Join a community of retail investors to discuss stocks, share market perspectives, participate in community
            sentiment polls, and discover new opportunities.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
            <button
              type="button"
              onClick={onGetStarted}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-home-brand px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-home-brand/90 ${FOCUS_ON_NIGHT} sm:w-auto sm:px-7 sm:py-3.5`}
            >
              Join the Community
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="#features"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-night sm:w-auto sm:px-7 sm:py-3.5"
            >
              Explore Features
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 sm:mt-10 sm:gap-x-8 sm:gap-y-3 sm:text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-extrabold text-white">{fmtCount(data.roomCount, data.loading)}</span>
              <span>chat rooms</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-extrabold text-white">{fmtCount(data.pollCount, data.loading)}</span>
              <span>active polls</span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm sm:max-w-lg lg:justify-self-end">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-home-neon" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">Market overview</span>
              </div>
              <Activity className="h-4 w-4 text-home-neon" aria-hidden="true" />
            </div>
            <div className="mt-4 rounded-2xl bg-home-night p-4">
              {renderCandles()}
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-white/50">
                <span>Illustrative chart</span>
                <span>Community sentiment preview</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["BUY", "border-home-neon/50 bg-home-neon/15 text-home-neon"],
                ["HOLD", "border-home-hold/50 bg-home-hold/15 text-home-hold"],
                ["SELL", "border-home-bear/50 bg-home-bear/15 text-home-bear"],
              ].map(([label, tone]) => (
                <div key={label} className={`rounded-xl border py-2 text-center text-[11px] font-bold uppercase tracking-wide ${tone}`}>
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                [MessagesSquare, data.roomCount, "Chat rooms"],
                [Vote, data.pollCount, "Open polls"],
              ].map(([Icon, value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 px-2 py-2.5 text-center">
                  <Icon className="mx-auto h-4 w-4 text-white/60" aria-hidden="true" />
                  <div className="mt-1 font-display text-base font-extrabold text-white">{fmtCount(value, data.loading)}</div>
                  <div className="text-[11px] text-white/50">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- stats */

export function renderHomeStats(data) {
  const stats = [
    { icon: Users, value: null, label: "Active Traders", hint: "Data not available yet" },
    { icon: MessagesSquare, value: data.roomCount, label: "Live Chat Rooms", hint: "Rooms open to join" },
    { icon: Vote, value: data.pollCount, label: "Active Community Polls", hint: "Sentiment polls running now" },
    { icon: TrendingUp, value: data.trendingCount, label: "Trending Stocks", hint: "Flagged by the community" },
  ];
  return (
    <section className="bg-home-cream">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-home-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md lg:p-6">
              {renderIconTile(s.icon)}
              <div className="mt-4 font-display text-3xl font-extrabold tracking-tight text-home-ink lg:text-4xl">
                {s.value === null ? "—" : fmtCount(s.value, data.loading)}
              </div>
              <div className="mt-1 text-sm font-semibold text-home-ink">{s.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-home-muted">{s.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- features */

export function renderHomeFeatures() {
  return (
    <section id="features" className="scroll-mt-24 bg-home-cream">
      <div className={CONTAINER}>
        {renderSectionHeading(
          "Features",
          "Everything you need to stay in the conversation",
          "Purpose-built tools for retail investors who would rather research together than decide alone."
        )}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_FEATURES.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col rounded-2xl border border-home-line bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {renderIconTile(f.icon, "h-11 w-11 bg-home-tint text-home-brand")}
              <h3 className="mt-5 font-display text-lg font-bold text-home-ink">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-home-muted">{f.body}</p>
              <Link
                to={f.to}
                className={`mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-home-brand transition-colors hover:text-home-ink ${FOCUS} focus-visible:ring-offset-2`}
              >
                {f.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- community */

function renderCommunityCard(Icon, title, items, emptyText) {
  return (
    <div className="flex flex-col rounded-2xl border border-home-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2 text-home-brand">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <h3 className="font-display text-base font-bold text-home-ink">{title}</h3>
      </div>
      <div className="mt-4 flex-1 space-y-2.5">
        {items.length ? items : <p className="rounded-xl bg-home-cream px-3.5 py-3 text-sm text-home-muted">{emptyText}</p>}
      </div>
    </div>
  );
}

const ROW_LINK = "block rounded-xl bg-home-cream px-3.5 py-3 transition-colors hover:bg-home-tint";
const ROW_META = "mt-1 flex items-center gap-2 text-[11px] text-home-muted";
const ROW_CHIP = "rounded-full bg-white px-2 py-0.5 font-semibold";

export function renderHomeCommunity(data) {
  const empty = data.loading ? "Loading…" : null;
  const rooms = data.popularRooms.map((room) => (
    <Link key={room.id} to="/ChatRooms" className={ROW_LINK}>
      <div className="truncate text-sm font-semibold text-home-ink">{room.name}</div>
      <div className={ROW_META}>
        <span className={ROW_CHIP}>{HOME_ROOM_TYPE_LABELS[room.room_type] || "General"}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden="true" />
          {room.participant_count || 0}
        </span>
      </div>
    </Link>
  ));
  const polls = data.recentPolls.map((poll) => {
    const stock = data.pollStock(poll);
    const votes = Number(poll.total_votes) || 0;
    return (
      <Link key={poll.id} to="/Polls" className={ROW_LINK}>
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-home-ink">{poll.title || poll.question}</div>
        <div className={ROW_META}>
          {stock && <span className={ROW_CHIP}>{stock}</span>}
          <span>
            {votes} {votes === 1 ? "vote" : "votes"}
          </span>
        </div>
      </Link>
    );
  });
  const topics = data.trendingTopics.map(({ label, count }) => (
    <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-home-cream px-3.5 py-2.5">
      <span className="truncate text-sm font-semibold text-home-ink">{label}</span>
      <span className="shrink-0 text-[11px] font-semibold text-home-muted">
        {count} {count === 1 ? "thread" : "threads"}
      </span>
    </div>
  ));

  return (
    <section className="bg-home-cream">
      <div className={CONTAINER}>
        {renderSectionHeading(
          "Community",
          "Real conversations, happening today",
          "A look at the rooms and polls the community is engaging with right now."
        )}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {renderCommunityCard(MessagesSquare, "Popular discussion rooms", rooms, empty || "Sign in to see the rooms you can join.")}
          {renderCommunityCard(Vote, "Recent community polls", polls, empty || "No open polls right now.")}
          {renderCommunityCard(Flame, "Trending discussion topics", topics, empty || "No trending topics yet.")}
        </div>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/ChatRooms"
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-home-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-home-brand/90 ${FOCUS} focus-visible:ring-offset-2`}
          >
            Explore Chat Rooms
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/Polls"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-home-line bg-white px-6 py-3 text-sm font-bold text-home-ink transition-colors hover:bg-home-tint ${FOCUS} focus-visible:ring-offset-2`}
          >
            View Community Polls
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- reviews */

function renderReviewCard(r) {
  return (
    <figure className="flex h-full w-[300px] shrink-0 flex-col rounded-2xl border border-home-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:w-[360px]">
      {renderRatingStars(r.rating)}
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-home-ink">“{r.text}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-home-line pt-4">
        <img src={r.avatar} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full border border-home-line object-cover" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-home-ink">{r.name}</div>
          <div className="flex items-center gap-1 text-xs text-home-muted">
            <ShieldCheck className="h-3 w-3 text-home-brand" aria-hidden="true" />
            Verified member
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

export function renderHomeReviews(data) {
  const average = HOME_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / HOME_REVIEWS.length;
  const summary = [
    {
      label: "Average rating",
      value: (
        <>
          <span>{average.toFixed(1)}</span>
          <span className="text-sm font-semibold text-home-muted">/5</span>
        </>
      ),
    },
    { label: "Member reviews", value: HOME_REVIEWS.length },
    { label: "Votes cast on polls", value: fmtCount(data.votesCast, data.loading) },
  ];
  return (
    <section id="reviews" className="scroll-mt-24 bg-white">
      <div className={CONTAINER}>
        {renderSectionHeading(
          "Member reviews",
          "Real members, real experiences",
          "What retail investors say after using Protocall's community polls, chat rooms and market insights."
        )}
        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-home-line bg-home-cream p-6 sm:p-7">
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-home-line">
            {summary.map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex items-center justify-center gap-2 font-display text-2xl font-extrabold tracking-tight text-home-ink">
                  {s.value}
                </div>
                <div className="mt-1 text-xs font-semibold leading-relaxed text-home-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Two endless rows in opposite directions (shared with the Dashboard
            review carousel). One row holds three cards, so the run is laid out
            twice to stay wider than the container and loop without a gap. */}
        <div className="mt-12 space-y-3">
          {[HOME_REVIEWS.slice(0, 3), HOME_REVIEWS.slice(3)].map((row, i) =>
            renderMarqueeRow({
              items: row,
              renderItem: renderReviewCard,
              keyOf: (r) => r.name,
              direction: i === 0 ? "right" : "left",
              label: `Member reviews, row ${i === 0 ? "one" : "two"}`,
              copies: 2,
              durationSeconds: 110,
            })
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ how it works */

export function renderHomeSteps() {
  return (
    <section className="bg-white">
      <div className={CONTAINER}>
        {renderSectionHeading("How it works", "Three steps to a better-informed portfolio")}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {HOME_STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-home-line bg-home-cream p-6">
              <span className="font-display text-5xl font-extrabold leading-none text-home-brand opacity-15">
                {String(i + 1).padStart(2, "0")}
              </span>
              {renderIconTile(step.icon, "mt-4 h-11 w-11 bg-white text-home-brand shadow-sm")}
              <h3 className="mt-4 font-display text-lg font-bold text-home-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-home-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- membership */

export function renderHomeMembership() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-home-night via-home-night to-home-royal text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-home-brand opacity-25 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-home-neon" aria-hidden="true" />
              Membership
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Go beyond the public feed</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Membership unlocks the deeper parts of the community — focused rooms, advisor content and member events. Plan details
              and pricing are listed on the membership page.
            </p>
            <Link
              to="/Subscription"
              className={`mt-8 inline-flex items-center gap-2 rounded-xl bg-home-brand px-7 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-home-brand/90 ${FOCUS_ON_NIGHT}`}
            >
              Explore Membership Options
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {HOME_MEMBERSHIP.map((m) => (
              <div key={m.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                {renderIconTile(m.icon, "h-10 w-10 bg-home-brand text-white")}
                <h3 className="mt-4 font-display text-base font-bold text-white">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- about */

export function renderHomeAbout() {
  return (
    <section id="about" className="scroll-mt-24 bg-home-cream">
      <div className={CONTAINER}>
        {renderSectionHeading(
          "About PROTOCALL",
          "Built for responsible, transparent discussion",
          "PROTOCALL is a community platform. It is not a broker, it does not hold your money, and it does not place trades on your behalf."
        )}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_ABOUT.map((a) => (
            <div key={a.title} className={`rounded-2xl border bg-white p-6 shadow-sm ${a.warning ? "border-home-hold" : "border-home-line"}`}>
              {renderIconTile(a.icon, a.warning ? "h-10 w-10 bg-home-hold text-white" : undefined)}
              <h3 className="mt-4 font-display text-base font-bold text-home-ink">{a.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-home-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- cta */

export function renderHomeCta(onGetStarted) {
  return (
    <section className="bg-white">
      <div className={CONTAINER}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-home-night via-home-night to-home-royal px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-home-brand opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-home-brand opacity-20 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                Your Market Community Starts Here.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70 lg:mx-0">
                Discover stocks, exchange perspectives, and become part of the PROTOCALL community. Not sure where to begin? Ask
                Proto.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-home-brand px-7 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-home-brand/90 ${FOCUS_ON_NIGHT}`}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <Link
                  to="/ChatRooms"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-night"
                >
                  Explore the Community
                </Link>
              </div>
            </div>
            <ProtoGuide />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */

const SOCIAL_BTN =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 backdrop-blur-sm transition-all duration-300";

function renderSocialLink({ label, icon: Icon, href }) {
  const icon = <Icon className="h-4 w-4 text-white" aria-hidden="true" />;
  return href ? (
    <a
      key={label}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={`Follow us on ${label}`}
      className={`${SOCIAL_BTN} hover:-translate-y-0.5 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
    >
      {icon}
    </a>
  ) : (
    <span key={label} role="img" aria-label={`${label} (coming soon)`} title={`${label} (Coming Soon)`} className={`${SOCIAL_BTN} cursor-default opacity-70`}>
      {icon}
    </span>
  );
}

export function renderHomeFooter(settings) {
  return (
    <footer
      className="relative bg-home-night bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `linear-gradient(rgba(10, 5, 21, 0.86), rgba(30, 10, 60, 0.9)), url(${footerBackdrop})` }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-home-brand via-home-neon to-home-brand" />
      <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-14 sm:px-8 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <img src={emblemLight} alt="Protocall logo" className="h-9 w-9 shrink-0 object-contain" />
              <span className="font-display text-lg font-extrabold tracking-tight">PROTOCALL</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              A community platform for Indian retail investors to discuss stocks, share perspectives and participate in community
              sentiment polls.
            </p>
            <div className="mt-5 flex gap-3">{HOME_SOCIAL.map(renderSocialLink)}</div>
            <div className="mt-5 space-y-2">
              {settings.contact_email && (
                <a href={`mailto:${settings.contact_email}`} className={`${FOOTER_LINK} flex items-center gap-2`}>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {settings.contact_email}
                </a>
              )}
              {settings.contact_phone && (
                <a href={`tel:${settings.contact_phone}`} className={`${FOOTER_LINK} flex items-center gap-2`}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {settings.contact_phone}
                </a>
              )}
              {settings.company_address && (
                <p className="flex items-start gap-2 text-sm text-white/60">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {settings.company_address}
                </p>
              )}
            </div>
          </div>
          {HOME_FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className={FOOTER_LINK}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-xs leading-relaxed text-white/50">
            Market information and community discussions on PROTOCALL are for informational and educational purposes only, and are
            not a guarantee of investment outcomes.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/50">© {new Date().getFullYear()} PROTOCALL. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {HOME_LEGAL_LINKS.map((l) => (
                <Link key={l.label} to={l.to} className="text-xs text-white/50 transition-colors hover:text-white">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
