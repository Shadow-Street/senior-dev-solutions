import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { formatINR } from '@/lib/format';
import { apiErrorMessage, presetRange, RANGE_PRESETS, STATUS_LABELS } from '@/lib/financialsApi';

/** Rupees with paise when present; '—' for anything missing (never ₹NaN). */
export const inr = (value) => formatINR(value);

/**
 * Loads `loader()` whenever `deps` change. Returns { data, error, loading, reload }.
 * A response that arrives after a newer request started is ignored.
 */
export function useFinanceData(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  const reload = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (id === seq.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ data: s.data, error: apiErrorMessage(error, 'Could not load this data.'), loading: false }));
    }
  }, [run]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export function LoadingState({ label = 'Loading financial data…' }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 p-12 text-subtle">
      <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <AlertTriangle className="w-8 h-8 text-sell" aria-hidden="true" />
      <p className="text-foreground font-medium">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyRows({ title = 'Nothing to show', description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-subtle">
      <Inbox className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm max-w-md">{description}</p>}
    </div>
  );
}

/** Wraps a view: loading (first load), error with retry, then children(data). */
export function DataView({ query, children, loadingLabel }) {
  if (query.loading && !query.data) return <LoadingState label={loadingLabel} />;
  if (query.error && !query.data) return <ErrorState message={query.error} onRetry={query.reload} />;
  if (!query.data) return null;
  return (
    <div className="relative" aria-busy={query.loading}>
      {query.error && <p role="alert" className="mb-3 text-sm text-sell">{query.error} (showing the last loaded figures)</p>}
      {children(query.data)}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'default', icon: Icon }) {
  const tones = {
    default: 'text-foreground',
    primary: 'text-primary',
    positive: 'text-buy-muted-foreground',
    negative: 'text-sell',
    caution: 'text-hold-muted-foreground',
  };
  return (
    <Card className="shadow-sm border bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-subtle font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 break-words ${tones[tone] || tones.default}`}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          {Icon && <Icon className="w-8 h-8 text-primary opacity-40 shrink-0" aria-hidden="true" />}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_STYLE = {
  success: 'bg-buy-muted text-buy-muted-foreground',
  processed: 'bg-buy-muted text-buy-muted-foreground',
  matched: 'bg-buy-muted text-buy-muted-foreground',
  pending: 'bg-hold-muted text-hold-muted-foreground',
  abandoned: 'bg-surface-2 text-subtle',
  processing: 'bg-premium-muted text-primary',
  in_progress: 'bg-premium-muted text-primary',
  failed: 'bg-sell-muted text-sell-muted-foreground',
  rejected: 'bg-sell-muted text-sell-muted-foreground',
  refunded: 'bg-surface-2 text-foreground',
  partially_refunded: 'bg-surface-2 text-foreground',
  failed_at_gateway: 'bg-surface-2 text-foreground',
};

export function StatusBadge({ status, label }) {
  return (
    <Badge className={`${STATUS_STYLE[status] || 'bg-surface-2 text-foreground'} border-0 whitespace-nowrap`}>
      {label || STATUS_LABELS[status] || String(status || '—').replace(/_/g, ' ')}
    </Badge>
  );
}

/** Period picker shared by every Financials view. value: { preset, from, to }. */
export function DateRangeBar({ value, onChange, idPrefix = 'fin' }) {
  const setPreset = (preset) => {
    if (preset === 'custom') onChange({ ...value, preset });
    else onChange({ preset, ...presetRange(preset) });
  };
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-period`}>Period</Label>
        <Select value={value.preset} onValueChange={setPreset}>
          <SelectTrigger id={`${idPrefix}-period`} className="w-full md:w-[180px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-from`}>From</Label>
        <Input id={`${idPrefix}-from`} type="date" value={value.from} max={value.to || undefined}
          onChange={(e) => onChange({ ...value, preset: 'custom', from: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-to`}>To</Label>
        <Input id={`${idPrefix}-to`} type="date" value={value.to} min={value.from || undefined}
          onChange={(e) => onChange({ ...value, preset: 'custom', to: e.target.value })} />
      </div>
      <p className="text-xs text-muted-foreground md:pb-2">Dates are India time (IST).</p>
    </div>
  );
}

/** Simple previous / next pager. */
export function Pager({ total, limit, offset, onChange }) {
  if (!total) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 p-4 text-sm text-subtle">
      <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(Math.max(0, offset - limit))}>Previous</Button>
        <span aria-live="polite">Page {page} of {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(offset + limit)}>Next</Button>
      </div>
    </nav>
  );
}

/** Accessible table wrapper with a caption for screen readers. */
export function DataTable({ caption, head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs text-subtle uppercase bg-surface-2">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-divider">{children}</tbody>
      </table>
    </div>
  );
}

const node = PropTypes.node;
LoadingState.propTypes = { label: PropTypes.string };
ErrorState.propTypes = { message: PropTypes.string, onRetry: PropTypes.func };
EmptyRows.propTypes = { title: PropTypes.string, description: node };
DataView.propTypes = {
  query: PropTypes.shape({ data: PropTypes.any, error: PropTypes.string, loading: PropTypes.bool, reload: PropTypes.func }).isRequired,
  children: PropTypes.func.isRequired,
  loadingLabel: PropTypes.string,
};
StatCard.propTypes = { label: PropTypes.string.isRequired, value: node, hint: node, tone: PropTypes.string, icon: PropTypes.elementType };
StatusBadge.propTypes = { status: PropTypes.string, label: PropTypes.string };
DateRangeBar.propTypes = {
  value: PropTypes.shape({ preset: PropTypes.string, from: PropTypes.string, to: PropTypes.string }).isRequired,
  onChange: PropTypes.func.isRequired,
  idPrefix: PropTypes.string,
};
Pager.propTypes = { total: PropTypes.number, limit: PropTypes.number.isRequired, offset: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired };
DataTable.propTypes = { caption: PropTypes.string.isRequired, head: PropTypes.arrayOf(PropTypes.string).isRequired, children: node };
