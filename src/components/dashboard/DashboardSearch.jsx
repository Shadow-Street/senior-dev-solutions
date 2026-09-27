import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, MessageSquare, Wallet, Newspaper, AlertCircle } from "lucide-react";
import { ChatRoom, Pledge, News } from "@/lib/apiClient";
import { createPageUrl } from "@/utils";

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;
const PER_GROUP = 4;

const GROUPS = [
  { key: "pools", label: "Pools", icon: Wallet },
  { key: "rooms", label: "Stock Chat Rooms", icon: MessageSquare },
  { key: "news", label: "Stock News", icon: Newspaper },
];

const matches = (needle, ...fields) =>
  fields.some((f) => typeof f === "string" && f.toLowerCase().includes(needle));

export default function DashboardSearch({ className = "" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  // Guards against a slow earlier request overwriting a newer one.
  const requestIdRef = useRef(0);

  // Close on outside click / Escape
  useEffect(() => {
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const runSearch = useCallback(async (raw) => {
    const needle = raw.trim().toLowerCase();
    const requestId = ++requestIdRef.current;
    setStatus("loading");

    // Reuses the existing list endpoints; there is no unified search API.
    // Each source fails independently so one outage cannot blank the whole panel.
    const [rooms, pools, news] = await Promise.all([
      ChatRoom.list("created_at", 100, 0).catch(() => null),
      Pledge.list("created_at", 100, 0).catch(() => null),
      News.getLatest(30, "business").catch(() => null),
    ]);

    if (requestId !== requestIdRef.current) return; // a newer query superseded this one

    if (rooms === null && pools === null && news === null) {
      setStatus("error");
      setResults(null);
      return;
    }

    setResults({
      pools: (Array.isArray(pools) ? pools : [])
        .filter((p) => matches(needle, p.stock_symbol, p.status, p.pledge_type))
        .slice(0, PER_GROUP)
        .map((p) => ({
          id: p.id,
          title: p.stock_symbol || "Pool",
          subtitle: [p.pledge_type, p.status].filter(Boolean).join(" · ") || "Pledge pool",
          to: createPageUrl("PledgePool"),
        })),
      rooms: (Array.isArray(rooms) ? rooms : [])
        .filter((r) => matches(needle, r.name, r.description, r.stock_symbol))
        .slice(0, PER_GROUP)
        .map((r) => ({
          id: r.id,
          title: r.name || r.stock_symbol || "Chat room",
          subtitle: r.stock_symbol || r.room_type || "Stock chat room",
          to: r.stock_symbol
            ? `${createPageUrl("ChatRooms")}?stock_symbol=${encodeURIComponent(r.stock_symbol)}`
            : createPageUrl("ChatRooms"),
        })),
      news: (Array.isArray(news) ? news : [])
        .filter((n) => matches(needle, n.title, n.summary, n.source))
        .slice(0, PER_GROUP)
        .map((n) => ({
          id: n.id || n.title,
          title: n.title,
          subtitle: n.source || "Market news",
          to: createPageUrl("News"),
        })),
    });
    setStatus("ready");
  }, []);

  // Debounced so we never fire a request per keystroke.
  useEffect(() => {
    if (query.trim().length < MIN_QUERY) {
      setResults(null);
      setStatus("idle");
      requestIdRef.current++; // cancel any in-flight result
      return;
    }
    const timer = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const go = (to) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  const total = results ? GROUPS.reduce((n, g) => n + (results[g.key]?.length || 0), 0) : 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="sr-only" htmlFor="dashboard-search">
        Search pools, Stock Chat Rooms and stock news
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id="dashboard-search"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search pools, rooms, or news..."
        autoComplete="off"
        className="h-10 w-full rounded-full border border-border bg-input pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
      {status === "loading" && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && query.trim().length >= MIN_QUERY && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-border bg-popover shadow-xl">
          {status === "error" && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-sell-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Search is unavailable right now. Please try again.
            </div>
          )}

          {status === "loading" && (
            <div className="px-4 py-6 text-sm text-muted-foreground">Searching…</div>
          )}

          {status === "ready" && total === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No pools, Stock Chat Rooms or news match “{query.trim()}”.
            </div>
          )}

          {status === "ready" &&
            total > 0 &&
            GROUPS.map(({ key, label, icon: Icon }) => {
              const items = results?.[key] || [];
              if (!items.length) return null;
              return (
                <div key={key} className="border-b border-divider last:border-b-0">
                  <p className="flex items-center gap-2 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </p>
                  {items.map((item) => (
                    <button
                      key={`${key}-${item.id}`}
                      type="button"
                      onClick={() => go(item.to)}
                      className="block w-full px-4 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-subtle">{item.subtitle}</span>
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
