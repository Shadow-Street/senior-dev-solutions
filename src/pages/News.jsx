import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
  SearchX,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
} from "lucide-react";
import { News } from "@/lib/apiClient";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 400;
const ALL = "all";

const SENTIMENT_OPTIONS = [
  { value: ALL, label: "Any sentiment" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const RANGE_OPTIONS = [
  { value: ALL, label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const INDUSTRY_OPTIONS = [
  "Technology",
  "Financial Services",
  "Energy",
  "Healthcare",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Industrials",
  "Basic Materials",
  "Utilities",
  "Real Estate",
  "Communication Services",
];

const SYMBOL_OPTIONS = [
  { value: "RELIANCE.NS", label: "Reliance" },
  { value: "TCS.NS", label: "TCS" },
  { value: "HDFCBANK.NS", label: "HDFC Bank" },
  { value: "INFY.NS", label: "Infosys" },
  { value: "ICICIBANK.NS", label: "ICICI Bank" },
  { value: "SBIN.NS", label: "SBI" },
  { value: "ITC.NS", label: "ITC" },
  { value: "BHARTIARTL.NS", label: "Bharti Airtel" },
  { value: "LT.NS", label: "L&T" },
  { value: "ADANIENT.NS", label: "Adani Enterprises" },
];

const INITIAL_QUERY = { q: "", sentiment: ALL, range: ALL, industries: ALL, symbols: ALL, page: 1 };

/** Only http(s) links are ever rendered as hrefs or image sources. */
function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function timeAgo(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function toApiParams(query) {
  const params = { page: query.page, limit: PAGE_SIZE };
  if (query.q) params.q = query.q;
  if (query.sentiment !== ALL) params.sentiment = query.sentiment;
  if (query.range !== ALL) params.range = query.range;
  if (query.industries !== ALL) params.industries = query.industries;
  if (query.symbols !== ALL) params.symbols = query.symbols;
  return params;
}

function renderSentimentBadge(sentiment) {
  if (!sentiment) return null;
  const styles = {
    positive: { cls: "bg-buy-muted text-buy-muted-foreground border-buy/30", Icon: TrendingUp, label: "Positive" },
    negative: { cls: "bg-sell-muted text-sell-muted-foreground border-sell/30", Icon: TrendingDown, label: "Negative" },
    neutral: { cls: "bg-surface-2 text-subtle border-divider", Icon: Minus, label: "Neutral" },
  }[sentiment];
  if (!styles) return null;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${styles.cls}`}>
      <styles.Icon className="h-3 w-3" aria-hidden="true" />
      {styles.label}
    </Badge>
  );
}

// The placeholder always sits underneath; a failed or missing image simply
// hides itself, so no per-card state is needed.
function renderThumb(imageUrl) {
  const src = safeHttpUrl(imageUrl);
  return (
    <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-premium-muted">
      <Newspaper className="h-8 w-8 text-premium" aria-hidden="true" />
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}

function renderArticleCard(article, onPickSymbol) {
  const href = safeHttpUrl(article.url);
  const symbols = (article.entities || []).filter((e) => e.symbol).slice(0, 3);
  return (
    <Card
      key={article.id}
      className="flex h-full flex-col overflow-hidden border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
    >
      {renderThumb(article.image_url)}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {renderSentimentBadge(article.sentiment)}
          {symbols.map((e) => (
            <button
              key={e.symbol}
              type="button"
              onClick={() => onPickSymbol(e.symbol)}
              title={e.name || e.symbol}
              className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-foreground hover:border-premium-light hover:bg-premium-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {e.symbol}
            </button>
          ))}
        </div>

        <h3 className="line-clamp-3 text-base font-semibold leading-snug text-foreground">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary focus:outline-none focus-visible:underline"
            >
              {article.title}
            </a>
          ) : (
            article.title
          )}
        </h3>

        {(article.description || article.snippet) && (
          <p className="line-clamp-3 text-sm text-subtle">{article.description || article.snippet}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-subtle">
          <span className="min-w-0 truncate font-medium">{article.source || "Unknown source"}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <time dateTime={article.published_at || undefined}>{timeAgo(article.published_at)}</time>
          </span>
        </div>

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:underline"
            aria-label={`Read full story: ${article.title} (opens in a new tab)`}
          >
            Read story <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function renderSkeletonCards(count = PAGE_SIZE / 2) {
  return Array.from({ length: count }, (_, i) => (
    <Card key={i} className="overflow-hidden border border-border bg-card">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  ));
}

function renderMessageState(Icon, title, description, action) {
  return (
    <Card className="mx-auto w-full max-w-lg border border-border bg-card">
      <CardContent className="flex flex-col items-center space-y-3 p-8 text-center sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
          <Icon className="h-7 w-7 text-premium" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-subtle">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}

function renderFilterSelect(label, value, onChange, options) {
  return (
    <div className="min-w-0 flex-1 sm:min-w-[11rem] sm:flex-none">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11" aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function NewsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState(null);
  // loading | ready | error | unconfigured
  const [status, setStatus] = useState("loading");
  // generic | unavailable (provider budget spent / down, HTTP 503) | login (HTTP 401)
  const [errorKind, setErrorKind] = useState("generic");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const lastKey = useRef(0);

  const updateFilters = useCallback((patch) => {
    setQuery((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  // Debounced server-side search.
  useEffect(() => {
    const trimmed = searchInput.trim();
    const id = setTimeout(() => {
      setQuery((prev) => (prev.q === trimmed ? prev : { ...prev, q: trimmed, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const isMore = query.page > 1 && lastKey.current === reloadKey;
    lastKey.current = reloadKey;
    if (isMore) setLoadingMore(true);
    else setStatus("loading");

    News.getFeed(toApiParams(query), controller.signal)
      .then((data) => {
        if (data && data.configured === false) {
          setArticles([]);
          setMeta(null);
          setStatus("unconfigured");
          return;
        }
        const incoming = Array.isArray(data?.articles) ? data.articles : [];
        setArticles((prev) => {
          if (query.page === 1) return incoming;
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...incoming.filter((a) => !seen.has(a.id))];
        });
        setMeta(data?.meta || null);
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        const code = err?.response?.status;
        setErrorKind(code === 503 ? "unavailable" : code === 401 ? "login" : "generic");
        setStatus("error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMore(false);
      });

    return () => controller.abort();
  }, [query, reloadKey]);

  const retry = () => setReloadKey((k) => k + 1);
  const loadMore = () => setQuery((prev) => ({ ...prev, page: prev.page + 1 }));
  const pickSymbol = (symbol) => {
    updateFilters({ symbols: symbol });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const clearFilters = () => {
    setSearchInput("");
    setQuery(INITIAL_QUERY);
  };

  const filtersActive = query.q !== "" || query.sentiment !== ALL || query.range !== ALL
    || query.industries !== ALL || query.symbols !== ALL;

  const symbolOptions = [{ value: ALL, label: "All stocks" }, ...SYMBOL_OPTIONS];
  if (query.symbols !== ALL && !SYMBOL_OPTIONS.some((o) => o.value === query.symbols)) {
    symbolOptions.push({ value: query.symbols, label: query.symbols });
  }
  const industryOptions = [{ value: ALL, label: "All industries" }, ...INDUSTRY_OPTIONS.map((i) => ({ value: i, label: i }))];

  const showLoadMore = status === "ready" && meta?.has_more;
  const loadMoreFailed = status === "error" && articles.length > 0;

  let body;
  if (status === "unconfigured") {
    body = renderMessageState(
      Newspaper,
      "News feed not configured",
      "The market news feed has not been set up yet. Please check back soon.",
    );
  } else if (status === "loading") {
    body = (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading news">
        {renderSkeletonCards()}
      </div>
    );
  } else if (status === "error" && articles.length === 0) {
    const copy = {
      unavailable: ["News is temporarily unavailable", "We have reached our limit for fetching fresh stories right now. Please try again in a little while."],
      login: ["Sign in to search the news", "Searching and filtering by stock needs a signed-in account. The latest headlines are still available without one."],
      generic: ["Could not load the news", "Something went wrong while fetching the latest market news."],
    }[errorKind];
    body = renderMessageState(
      AlertTriangle,
      copy[0],
      copy[1],
      errorKind === "login" ? (
        <Button variant="outline" onClick={clearFilters} className="mt-2">
          <X className="mr-2 h-4 w-4" aria-hidden="true" /> Clear filters
        </Button>
      ) : <Button onClick={retry} className="mt-2 bg-buy font-semibold text-buy-foreground hover:bg-buy-soft">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Try again
      </Button>,
    );
  } else if (articles.length === 0) {
    body = renderMessageState(
      SearchX,
      "No stories found",
      filtersActive
        ? "Nothing matches these filters. Try a different search or clear the filters."
        : "There are no market stories right now. Please check back shortly.",
      filtersActive ? (
        <Button variant="outline" onClick={clearFilters} className="mt-2">
          <X className="mr-2 h-4 w-4" aria-hidden="true" /> Clear filters
        </Button>
      ) : null,
    );
  } else {
    body = (
      <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((a) => renderArticleCard(a, pickSymbol))}
          {loadingMore && renderSkeletonCards(3)}
        </div>
        <div className="flex flex-col items-center gap-3 pt-2">
          {loadMoreFailed && (
            <p role="alert" className="text-sm text-sell-muted-foreground">
              {errorKind === "unavailable"
                ? "News is temporarily unavailable. Try again in a little while."
                : errorKind === "login" ? "Sign in to browse further." : "Could not load more stories."}
            </p>
          )}
          {(showLoadMore || loadMoreFailed) && (
            <Button
              variant="outline"
              onClick={loadMoreFailed ? () => setQuery((p) => ({ ...p })) : loadMore}
              disabled={loadingMore}
              className="h-11 rounded-full px-6 font-semibold"
            >
              {loadingMore
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
              {loadMoreFailed ? "Try again" : "Load more"}
            </Button>
          )}
          {status === "ready" && !meta?.has_more && articles.length > 0 && (
            <p className="text-xs text-subtle">You are all caught up.</p>
          )}
          {meta?.stale && status === "ready" && (
            <p className="text-xs text-subtle">Showing saved results while the news provider is busy.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="w-full bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="relative isolate overflow-hidden rounded-2xl bg-protocall-ink text-white shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-protocall-ink via-protocall-ink to-premium/40"
          />
          <div className="flex min-h-[130px] flex-col justify-center gap-2 p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <Newspaper className="h-7 w-7 text-buy" aria-hidden="true" />
              <h1 className="text-3xl font-bold tracking-tight text-white">Market News</h1>
            </div>
            <p className="text-white/90">Latest Indian stock market news, with sentiment and the stocks in the story</p>
          </div>
        </section>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.slice(0, 100))}
              placeholder="Search news, companies or topics..."
              aria-label="Search news"
              maxLength={100}
              className="h-11 pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {renderFilterSelect("Stock", query.symbols, (v) => updateFilters({ symbols: v }), symbolOptions)}
            {renderFilterSelect("Industry", query.industries, (v) => updateFilters({ industries: v }), industryOptions)}
            {renderFilterSelect("Sentiment", query.sentiment, (v) => updateFilters({ sentiment: v }), SENTIMENT_OPTIONS)}
            {renderFilterSelect("Time range", query.range, (v) => updateFilters({ range: v }), RANGE_OPTIONS)}
            {filtersActive && (
              <Button variant="ghost" onClick={clearFilters} className="h-11 text-subtle">
                <X className="mr-1 h-4 w-4" aria-hidden="true" /> Clear
              </Button>
            )}
          </div>
        </div>

        {body}
      </div>
    </div>
  );
}
