import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight, Sparkles } from 'lucide-react';
import heroBull from '@/assets/home/hero-green-bull.webp';
import { createHeroChart, STEP_AT } from './heroChart';

/**
 * Home hero as a scroll story (from the "Stock Protocall Home" design): the
 * stage pins under the header while a candlestick chart draws itself, and the
 * copy moves through three steps — the hero itself, Chat Rooms, Community
 * Polls — each with a matching overlay on the chart. The chart and every
 * overlay are illustrations: no market data, nothing is submitted.
 */

const FOCUS_ON_NIGHT =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-neon focus-visible:ring-offset-2 focus-visible:ring-offset-home-night';
const PRIMARY = `inline-flex items-center justify-center gap-2 rounded-xl bg-home-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-home-brand/90 sm:px-7 sm:py-3.5 ${FOCUS_ON_NIGHT}`;
const SECONDARY = `inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:px-7 sm:py-3.5 ${FOCUS_ON_NIGHT}`;
const EYEBROW = 'flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-home-neon sm:text-xs';
const STEP_BASE =
  'absolute inset-0 flex flex-col justify-center gap-4 transition-[opacity,transform,visibility] duration-[450ms] ease-out motion-reduce:transition-none sm:gap-5';
const OVERLAY_BASE =
  'absolute z-[2] transition-[opacity,transform,visibility] duration-[450ms] ease-out motion-reduce:transition-none';
const shown = (on) => (on ? 'visible translate-y-0 opacity-100' : 'invisible pointer-events-none translate-y-4 opacity-0');

const fmtCount = (n, loading) => (loading ? '…' : Number(n || 0).toLocaleString('en-IN'));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Eyebrow({ children }) {
  return (
    <span className={EYEBROW}>
      <span className="h-0.5 w-5 bg-home-neon" aria-hidden="true" />
      {children}
    </span>
  );
}
Eyebrow.propTypes = { children: PropTypes.node };

export default function HeroStory({ data, onGetStarted }) {
  const storyRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [step, setStep] = useState(0);
  const [vote, setVote] = useState('');

  useEffect(() => {
    const story = storyRef.current;
    const stage = stageRef.current;
    const reduceMotion = prefersReducedMotion();
    const chart = createHeroChart(canvasRef.current, { reduceMotion, onStep: setStep });
    chartRef.current = chart;

    // Progress 0..1 while the stage is pinned under the sticky header.
    const progress = () => {
      const pinTop = parseFloat(getComputedStyle(stage).top) || 0;
      const span = Math.max(1, story.offsetHeight - stage.offsetHeight);
      return (pinTop - story.getBoundingClientRect().top) / span;
    };
    const read = () => chart.setTarget(progress());
    chart.setTarget(progress(), { jump: true });
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  // Jump to a step (rail buttons): scroll the page to that step's position.
  const goToStep = (i) => {
    const story = storyRef.current;
    const stage = stageRef.current;
    if (!story || !stage) return;
    const pinTop = parseFloat(getComputedStyle(stage).top) || 0;
    const span = story.offsetHeight - stage.offsetHeight;
    const top = story.getBoundingClientRect().top + window.scrollY - pinTop + span * STEP_AT[i];
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <section ref={storyRef} className="relative h-[360vh] bg-home-night text-white" aria-label="Protocall introduction">
      <div ref={stageRef} className="sticky top-16 flex h-[calc(100vh-4rem)] items-center overflow-hidden supports-[height:100svh]:h-[calc(100svh-4rem)]">
        <img
          src={heroBull}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-left opacity-25 lg:opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-home-night/95 via-home-night/90 to-home-night/95 lg:bg-gradient-to-r lg:from-home-night lg:via-home-night/90 lg:to-home-night/70" />
        <div className="pointer-events-none absolute -left-24 -top-40 h-96 w-96 rounded-full bg-home-brand opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-home-royal opacity-30 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 content-center items-center gap-4 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14">
          {/* copy: three steps stacked in one place */}
          <div className="relative h-[44svh] min-h-[300px] lg:h-[460px]">
            <div className={`${STEP_BASE} ${shown(step === 0)}`} aria-hidden={step !== 0}>
              <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white sm:px-3.5 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-home-neon" aria-hidden="true" />
                A community for Indian retail investors
              </span>
              <h1 className="font-display text-[1.9rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Invest Smarter.
                <br />
                Discuss Better.
                <br />
                <span className="text-home-neon">Grow Together.</span>
              </h1>
              <p className="line-clamp-3 max-w-xl text-[13px] leading-relaxed text-white/75 sm:line-clamp-none sm:text-base lg:text-lg">
                Join a community of retail investors to discuss stocks, share market perspectives, participate in community
                sentiment polls, and discover new opportunities.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={onGetStarted} className={PRIMARY} tabIndex={step === 0 ? 0 : -1}>
                  Join the Community
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <a href="#features" className={SECONDARY} tabIndex={step === 0 ? 0 : -1}>
                  Explore Features
                </a>
              </div>
              <div className="hidden flex-wrap items-center gap-x-8 gap-y-2 text-sm text-white/70 sm:flex">
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

            <div className={`${STEP_BASE} ${shown(step === 1)}`} aria-hidden={step !== 1}>
              <Eyebrow>Chat Rooms</Eyebrow>
              <h2 className="font-display text-[1.9rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                Talk it through <span className="text-home-neon">before</span> you trade it.
              </h2>
              <p className="max-w-xl text-[13px] leading-relaxed text-white/75 sm:text-base lg:text-lg">
                Join a room, ask what is moving a stock and hear how others read it. Good questions get better answers when
                many people are looking.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={onGetStarted} className={PRIMARY} tabIndex={step === 1 ? 0 : -1}>
                  Join a Chat Room
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className={`${STEP_BASE} ${shown(step === 2)}`} aria-hidden={step !== 2}>
              <Eyebrow>Community Polls</Eyebrow>
              <h2 className="font-display text-[1.9rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                Ask the room. <span className="text-home-neon">Count the votes.</span>
              </h2>
              <p className="max-w-xl text-[13px] leading-relaxed text-white/75 sm:text-base lg:text-lg">
                Put a simple question to the community and see where investors lean. A poll is one tap, so more people answer.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={onGetStarted} className={PRIMARY} tabIndex={step === 2 ? 0 : -1}>
                  See Community Polls
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <a href="#features" className={SECONDARY} tabIndex={step === 2 ? 0 : -1}>
                  All Features
                </a>
              </div>
            </div>
          </div>

          {/* chart panel */}
          <div
            className="relative h-[34svh] min-h-[220px] overflow-hidden rounded-[18px] border-[1.5px] border-white/20 bg-[#14032E] shadow-[0_40px_90px_-40px_rgba(68,4,153,.7)] lg:h-[min(64vh,580px)] lg:min-h-[360px] lg:rounded-[22px]"
            role="img"
            aria-label="Illustration of a candlestick chart that draws itself as you scroll"
          >
            <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-start gap-3 whitespace-nowrap border-b border-white/10 bg-[#14032E]/55 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/60 backdrop-blur-sm lg:justify-between">
              <span className="hidden items-center gap-2 text-white lg:inline-flex">
                <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-home-lime shadow-[0_0_10px] shadow-home-lime motion-reduce:animate-none" aria-hidden="true" />
                Sample stock
              </span>
              <span>Illustration, not market data</span>
            </div>
            <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{ background: 'radial-gradient(110% 90% at 50% 45%, transparent 55%, rgba(20,3,46,.6) 100%), repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0 1px, transparent 1px 3px)' }}
              aria-hidden="true"
            />

            {/* step 1 overlay: a chat room */}
            <div className={`${OVERLAY_BASE} bottom-3 right-3 flex w-[min(250px,calc(100%-24px))] flex-col gap-2 lg:bottom-4 lg:right-4 lg:w-[min(300px,calc(100%-32px))] ${shown(step === 1)}`} aria-hidden="true">
              <div className="max-w-[88%] rounded-2xl rounded-bl-[4px] border-[1.5px] border-white/30 bg-white/10 px-3 py-2 text-[12.5px] leading-snug backdrop-blur lg:px-3.5 lg:py-2.5 lg:text-sm">
                <small className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] opacity-70">Chat room</small>
                What is behind this move?
              </div>
              <div className="max-w-[88%] self-end rounded-2xl rounded-br-[4px] bg-home-brand px-3 py-2 text-[12.5px] leading-snug lg:px-3.5 lg:py-2.5 lg:text-sm">
                Sharing how I read the last few sessions.
              </div>
              <div className="hidden rounded-full border-[1.5px] border-dashed border-white/30 bg-[#14032E]/50 px-4 py-2.5 text-[13px] text-white/65 lg:block">
                Add your take
              </div>
            </div>

            {/* step 2 overlay: an example poll (nothing is submitted) */}
            <fieldset
              className={`${OVERLAY_BASE} bottom-3 right-3 m-0 flex w-[min(260px,calc(100%-24px))] flex-col gap-2 rounded-[18px] border-[1.5px] border-white/30 bg-[#14032E]/80 p-3 backdrop-blur-md lg:bottom-4 lg:right-4 lg:w-[min(320px,calc(100%-32px))] lg:gap-3 lg:p-4 ${shown(step === 2)}`}
              disabled={step !== 2}
              aria-hidden={step !== 2}
            >
              <legend className="float-left w-full font-display text-sm font-bold leading-tight lg:text-base">Where does this go next?</legend>
              <div className="grid gap-2">
                {['Buy', 'Hold', 'Sell'].map((label) => {
                  const value = label.toLowerCase();
                  const checked = vote === value;
                  return (
                    <label key={value} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="hero-example-vote"
                        value={value}
                        checked={checked}
                        onChange={() => setVote(value)}
                        className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                      />
                      <span
                        className={`flex items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-1.5 text-[13px] font-semibold transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#9F71E0] lg:px-3.5 lg:py-2.5 lg:text-sm ${
                          checked ? 'border-[#9F71E0] bg-home-brand/45' : 'border-white/20'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded-full border-2 border-white ${checked ? 'bg-white shadow-[inset_0_0_0_3px] shadow-home-brand' : ''}`}
                          aria-hidden="true"
                        />
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="m-0 hidden font-mono text-[11px] tracking-[0.06em] text-white/60 lg:block">Example poll. Nothing is submitted.</p>
            </fieldset>
          </div>
        </div>

        {/* progress rail */}
        <div className="absolute bottom-5 left-5 z-[3] hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60 sm:left-8 lg:flex">
          <span>Scroll</span>
          {['Introduction', 'Chat Rooms', 'Community Polls'].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(i)}
              aria-label={`Show ${label}`}
              aria-current={step === i ? 'step' : undefined}
              className={`h-[3px] rounded-sm transition-all ${step === i ? 'w-10 bg-home-neon' : 'w-[26px] bg-white/25 hover:bg-white/50'} ${FOCUS_ON_NIGHT}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

HeroStory.propTypes = {
  data: PropTypes.shape({ roomCount: PropTypes.number, pollCount: PropTypes.number, loading: PropTypes.bool }).isRequired,
  onGetStarted: PropTypes.func.isRequired,
};
