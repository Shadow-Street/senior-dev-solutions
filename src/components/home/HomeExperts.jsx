import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck, Star, TrendingUp, Users } from "lucide-react";
import apiClient from "@/lib/apiClient";

/*
 * "Insights from the SEBI-Regd. Analysts" / "Learn from Protocall's
 * Finfluencers" carousel on the public Home page, rebuilt from
 * protocall.in/home. Two slides (Advisors, Finfluencers); each shows the
 * approved profiles as avatars and the selected one in a detail card.
 *
 * Data comes from the public, approved-only listings: GET /advisors (public
 * fields only) and GET /finfluencers/top (field-whitelisted).
 */

// null marks a failed request, so the card can say so instead of "none listed".
const take = (promise) => promise.then((r) => (Array.isArray(r?.data) ? r.data : [])).catch(() => null);
const fmtNumber = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0");

/** Specialization arrives as a JSON array, a JSON string or plain text. */
function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {
    // plain text
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const initials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

function toAdvisor(a) {
  const success = Number(a.success_rate);
  return {
    id: a.id,
    name: a.display_name || a.name || "Advisor",
    avatar: a.profile_image_url || a.avatar_url || null,
    badge: a.sebi_registration_number || a.verified ? { icon: ShieldCheck, label: "SEBI Regd." } : null,
    summary: toList(a.specialization).join(", ") || a.bio || "",
    tags: [],
    rating: Number(a.avg_rating) || 0,
    reviews: Number(a.review_count) || 0,
    followers: a.follower_count,
    successRate: a.success_rate === null || a.success_rate === undefined || !Number.isFinite(success) ? null : success,
  };
}

function toFinfluencer(f) {
  return {
    id: f.id,
    name: f.name || "Finfluencer",
    avatar: f.avatar_url || null,
    badge: { icon: BadgeCheck, label: "Verified" },
    summary: f.bio || "",
    tags: toList(f.specialization).slice(0, 4),
    rating: null,
    reviews: 0,
    followers: f.follower_count,
    successRate: null,
  };
}

const SLIDES = [
  {
    key: "advisors",
    label: "Advisors",
    eyebrow: "SEBI-registered analysts",
    title: "Insights from the SEBI-Regd. Analysts",
    body: "Verified market professionals on Protocall share their views, track record and research with the community. See who is worth following before you follow.",
    explore: { label: "Explore all SEBI-registered advisors", to: "/Advisors" },
    join: { label: "Become an Advisor", to: "/AdvisorRegistration" },
    empty: "No SEBI-registered advisors are listed yet.",
    failed: "We couldn't load advisors right now. Please try again later.",
  },
  {
    key: "finfluencers",
    label: "Finfluencers",
    eyebrow: "Community creators",
    title: "Learn from Protocall's Finfluencers",
    body: "Creators and educators breaking down the market in plain language — charts, strategy and everyday investing. Meet the voices the community follows.",
    explore: { label: "Explore all finfluencers", to: "/Finfluencers" },
    join: null,
    empty: "No finfluencers are listed yet.",
    failed: "We couldn't load finfluencers right now. Please try again later.",
  },
];

function renderAvatar(person, active) {
  const ring = active ? "bg-home-neon/15 ring-2 ring-home-neon" : "ring-1 ring-white/15 group-hover:ring-white/40";
  return (
    <span className={`rounded-full p-1 transition-all ${ring}`}>
      {person.avatar ? (
        <img
          src={person.avatar}
          alt=""
          loading="lazy"
          className={`h-20 w-20 rounded-full object-cover transition duration-300 sm:h-24 sm:w-24 ${
            active ? "grayscale-0" : "grayscale group-hover:grayscale-0"
          }`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`flex h-20 w-20 items-center justify-center rounded-full bg-white/10 font-display text-xl font-extrabold sm:h-24 sm:w-24 ${
            active ? "text-home-neon" : "text-white/70 group-hover:text-white"
          }`}
        >
          {initials(person.name)}
        </span>
      )}
    </span>
  );
}

function renderStat(Icon, value, label) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Icon className="h-4 w-4 text-home-neon" aria-hidden="true" />
      </span>
      <div>
        <div className="font-display text-base font-extrabold leading-tight text-white">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{label}</div>
      </div>
    </div>
  );
}

function renderRating(person) {
  if (person.rating === null) return null;
  if (!person.reviews) return <span className="text-xs font-semibold text-white/50">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70">
      <Star className="h-3.5 w-3.5 fill-home-neon text-home-neon" aria-hidden="true" />
      {person.rating.toFixed(1)} · {person.reviews} {person.reviews === 1 ? "review" : "reviews"}
    </span>
  );
}

function renderDetail(slide, person, failed) {
  const BadgeIcon = person?.badge?.icon;
  const rating = person && renderRating(person);
  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur sm:p-8" aria-live="polite">
      {person ? (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-extrabold tracking-tight text-white">{person.name}</h3>
              {person.badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-home-neon/15 px-2.5 py-1 text-[11px] font-bold text-home-neon">
                  <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                  {person.badge.label}
                </span>
              )}
            </div>
            {person.summary && <p className="mt-2 line-clamp-3 text-sm text-white/70">{person.summary}</p>}
            {(rating || person.tags.length > 0) && (
              <div className="mt-3 flex items-center gap-2">
                {person.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {person.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  rating
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-6 sm:gap-8">
            {renderStat(Users, fmtNumber(person.followers), "Followers")}
            {person.successRate !== null && renderStat(TrendingUp, `${person.successRate.toFixed(1)}%`, "Success rate")}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm font-semibold text-white/70">{failed ? slide.failed : slide.empty}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <Link to={slide.explore.to} className="inline-flex items-center gap-2 text-sm font-bold text-home-neon transition-colors hover:text-white">
          {slide.explore.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {slide.join && (
          <Link
            to={slide.join.to}
            className="inline-flex items-center gap-2 rounded-xl bg-home-neon px-4 py-2 text-xs font-bold text-home-ink transition-colors hover:bg-home-neon/90"
          >
            {slide.join.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-neon focus-visible:ring-offset-2 focus-visible:ring-offset-home-night";
const ARROW_BTN = `flex h-9 w-9 items-center justify-center rounded-full border border-home-neon/40 text-home-neon transition-colors hover:bg-home-neon hover:text-home-ink ${FOCUS_RING}`;

export default function HomeExperts() {
  const [people, setPeople] = useState({ advisors: [], finfluencers: [], loading: true });
  const [slideIndex, setSlideIndex] = useState(0);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [advisors, finfluencers] = await Promise.all([
        take(apiClient.get("/advisors", { params: { limit: 8, status: "approved", sort: "follower_count" } })),
        take(apiClient.get("/finfluencers/top", { params: { limit: 8 } })),
      ]);
      if (cancelled) return;
      setPeople({
        // Staff sessions see every status from /advisors; the public page shows approved only.
        advisors: advisors && advisors.filter((a) => !a.status || a.status === "approved").map(toAdvisor),
        finfluencers: finfluencers && finfluencers.map(toFinfluencer),
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slide = SLIDES[slideIndex];
  const failed = people[slide.key] === null;
  const list = people[slide.key] || [];
  const person = list[Math.min(selected, list.length - 1)] || null;

  const goTo = (index) => {
    setSlideIndex((index + SLIDES.length) % SLIDES.length);
    setSelected(0);
  };

  return (
    <div className="bg-home-cream">
      <section
        id="advisors"
        className="relative scroll-mt-24 overflow-hidden rounded-t-[2rem] bg-home-night text-white sm:rounded-t-[2.5rem]"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-home-neon via-home-brand to-home-neon" />
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-home-brand opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-home-royal opacity-30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div key={slide.key} className="animate-in fade-in-0 duration-500">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-home-neon">{slide.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{slide.title}</h2>
              <p className="mt-4 text-base leading-relaxed text-white/70">{slide.body}</p>
            </div>
            {list.length > 0 && (
              <div className="mt-10 flex flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:gap-x-10">
                {list.map((p, i) => {
                  const active = p === person;
                  return (
                    <button
                      key={p.id || i}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(i)}
                      className={`group flex w-24 flex-col items-center gap-3 rounded-2xl sm:w-32 ${FOCUS_RING}`}
                    >
                      {renderAvatar(p, active)}
                      <span
                        className={`text-center text-xs font-semibold leading-snug transition-colors sm:text-sm ${
                          active ? "text-white" : "text-white/60 group-hover:text-white/90"
                        }`}
                      >
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {people.loading ? (
              <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/15 bg-white/10 p-8 text-center text-sm font-semibold text-white/60">
                Loading…
              </div>
            ) : (
              renderDetail(slide, person, failed)
            )}
          </div>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button type="button" aria-label="Previous slide" onClick={() => goTo(slideIndex - 1)} className={ARROW_BTN}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={i === slideIndex}
                  onClick={() => goTo(i)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${FOCUS_RING} ${
                    i === slideIndex ? "bg-home-neon text-home-ink" : "border border-white/20 text-white/70 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Next slide" onClick={() => goTo(slideIndex + 1)} className={ARROW_BTN}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
