import { useState } from "react";
import { Sparkles } from "lucide-react";
import protoMascot from "@/assets/home/proto-mascot.webp";
import { HOME_PROTO_GREETING, HOME_PROTO_QA } from "./homeContent";

/**
 * "Ask Proto" card in the Home page's closing call to action (protocall.in/home):
 * the mascot, a speech bubble and four quick questions. Picking a question
 * swaps the bubble text with a short slide-up fade.
 */
export default function ProtoGuide() {
  const [active, setActive] = useState(null);
  const answer = active === null ? HOME_PROTO_GREETING : HOME_PROTO_QA[active].a;

  return (
    <div className="mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/25 shadow-2xl">
        <img
          src={protoMascot}
          alt="Proto, the Protocall mascot in a hoodie, surrounded by live market screens"
          loading="lazy"
          className="h-64 w-full object-cover object-[center_28%] sm:h-80 lg:h-[22rem]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-home-night via-home-night/35 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-home-night/70 px-3 py-1 text-[11px] font-bold text-home-neon backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-home-neon" />
          Proto is online
        </span>
      </div>
      <div className="relative -mt-4 px-3 sm:px-0">
        <div className="rounded-2xl bg-white p-4 text-home-ink shadow-xl sm:p-5" aria-live="polite">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-home-brand">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Proto
          </div>
          <p key={active ?? "greeting"} className="mt-2 animate-in fade-in-0 slide-in-from-bottom-1 text-sm leading-relaxed duration-300">
            {answer}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {HOME_PROTO_QA.map((item, i) => (
            <button
              key={item.q}
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive(i)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-neon ${
                active === i
                  ? "border-home-neon bg-home-neon text-home-ink"
                  : "border-white/25 text-white/80 hover:border-white/60 hover:text-white"
              }`}
            >
              {item.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
