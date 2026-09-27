import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertCircle, Loader2, MoreHorizontal } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stockAPI } from "@/components/stocks/LiveStockAPI";

const EXCHANGES = ["NSE", "BSE"];

// Finnhub resolutions: 1, 5, 15, 30, 60, D, W, M — paired with a lookback window.
const RANGES = [
  { key: "1D", resolution: "5", seconds: 24 * 60 * 60 },
  { key: "1W", resolution: "30", seconds: 7 * 24 * 60 * 60 },
  { key: "1M", resolution: "D", seconds: 30 * 24 * 60 * 60 },
  { key: "1Y", resolution: "D", seconds: 365 * 24 * 60 * 60 },
  { key: "5Y", resolution: "W", seconds: 5 * 365 * 24 * 60 * 60 },
];

const formatTime = (ms, rangeKey) => {
  const d = new Date(ms);
  if (rangeKey === "1D") {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (rangeKey === "5Y" || rangeKey === "1Y") {
    return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

function Sparkline({ positive }) {
  const stroke = positive ? "hsl(var(--buy))" : "hsl(var(--sell))";
  const d = positive
    ? "M0 16 L10 12 L20 14 L30 7 L40 9 L50 3"
    : "M0 4 L10 8 L20 6 L30 13 L40 11 L50 17";
  return (
    <svg width="52" height="20" viewBox="0 0 52 20" fill="none" aria-hidden="true" className="shrink-0">
      <path d={d} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketOverviewPanel({ indices = [], error = null }) {
  const [exchange, setExchange] = useState("NSE");
  const [rangeKey, setRangeKey] = useState("1D");
  const [series, setSeries] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | empty | error
  const [chartError, setChartError] = useState(null);

  const range = useMemo(() => RANGES.find(r => r.key === rangeKey) || RANGES[0], [rangeKey]);

  // The chart tracks the first index tile; falls back to a broad-market proxy.
  const chartSymbol = indices[0]?.symbol || "SPY";
  const chartLabel = indices[0]?.label || indices[0]?.name || chartSymbol;

  const loadCandles = useCallback(async () => {
    setStatus("loading");
    setChartError(null);
    try {
      const data = await stockAPI.getCandles(chartSymbol, range.resolution);
      const points = (data || [])
        .filter(p => p.close != null)
        .map(p => ({ t: p.time, value: p.close }));
      setSeries(points);
      setStatus(points.length ? "ready" : "empty");
    } catch (e) {
      setChartError(
        e?.response?.data?.error || "Chart data is unavailable for this symbol."
      );
      setStatus("error");
    }
  }, [chartSymbol, range.resolution]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Market Overview
            {status === "loading" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </h2>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-surface-2 p-0.5">
              {EXCHANGES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setExchange(ex)}
                  aria-pressed={exchange === ex}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    exchange === ex
                      ? "bg-primary text-primary-foreground"
                      : "text-subtle hover:text-foreground"
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-full bg-surface-2 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRangeKey(r.key)}
                  aria-pressed={rangeKey === r.key}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    rangeKey === r.key
                      ? "bg-primary text-primary-foreground"
                      : "text-subtle hover:text-foreground"
                  }`}
                >
                  {r.key}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-label="More options"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
          {/* Chart */}
          <div className="h-[230px] min-w-0">
            {status === "loading" && (
              <div className="flex h-full items-center justify-center rounded-lg bg-surface-2/60">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {status === "error" && (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-surface-2/60 px-4 text-center">
                <AlertCircle className="h-5 w-5 text-sell-muted-foreground" />
                <p className="text-sm text-sell-muted-foreground">{chartError}</p>
                <button
                  type="button"
                  onClick={loadCandles}
                  className="mt-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  Retry
                </button>
              </div>
            )}

            {status === "empty" && (
              <div className="flex h-full items-center justify-center rounded-lg bg-surface-2/60 px-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No chart data for {chartSymbol} over {rangeKey}.
                </p>
              </div>
            )}

            {status === "ready" && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--chart-grid))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(t) => formatTime(t, rangeKey)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => Number(v).toLocaleString("en-IN")}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--chart-1))", strokeWidth: 1, strokeDasharray: "3 3" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.6rem",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelFormatter={(t) => formatTime(t, rangeKey)}
                    formatter={(v) => [Number(v).toLocaleString("en-IN"), chartLabel]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#marketFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Index tiles */}
          <div className="flex flex-col gap-2">
            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-divider bg-surface-2 p-3 text-xs text-sell-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : indices.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-divider bg-surface-2 p-3">
                  <div className="h-3 w-20 animate-pulse rounded bg-border" />
                  <div className="mt-2 h-5 w-24 animate-pulse rounded bg-border" />
                </div>
              ))
            ) : (
              indices.map((idx) => {
                const positive = Number(idx.change_percent) >= 0;
                return (
                  <div key={idx.symbol} className="rounded-lg border border-divider bg-surface-2 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                      {idx.label || idx.symbol}
                    </p>
                    <div className="mt-0.5 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold leading-tight text-foreground">
                          {Number(idx.current_price || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            positive ? "text-positive" : "text-sell-muted-foreground"
                          }`}
                        >
                          {positive ? "▲" : "▼"} {positive ? "+" : ""}
                          {Number(idx.change_percent || 0).toFixed(2)}%
                        </p>
                      </div>
                      <Sparkline positive={positive} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
