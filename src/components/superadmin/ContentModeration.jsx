import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Eye, Loader2, Search, Shield, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { moderationApi, moderationErrorMessage, isMigrationPending } from '@/lib/moderationApi';
import { renderReviewPanel } from './moderation/ReviewPanel';
import ModerationHistory from './moderation/ModerationHistory';
import {
  ACTION_LABELS, NATIVE_SELECT_CLASS, REASON_LABELS, SEVERITY_STYLES, STATUS_STYLES, TARGET_LABELS, decisionLabel,
} from './moderation/constants';

const PAGE_SIZE = 20;
const EMPTY_COUNTS = { total: 0, pending: 0, escalated: 0, resolved: 0, dismissed: 0, critical: 0, high: 0, medium: 0, low: 0 };
const COUNTERS = [
  { key: 'total', label: 'Total Reports', className: 'bg-surface-2', text: 'text-foreground' },
  { key: 'pending', label: 'Pending', className: 'bg-hold-muted', text: 'text-hold-muted-foreground' },
  { key: 'escalated', label: 'Escalated', className: 'bg-sell-muted', text: 'text-sell-muted-foreground' },
  { key: 'resolved', label: 'Reviewed', className: 'bg-premium-muted', text: 'text-primary' },
  { key: 'dismissed', label: 'Dismissed', className: 'bg-surface-2', text: 'text-foreground' },
  { key: 'critical', label: 'Critical', className: 'bg-sell-muted', text: 'text-sell-muted-foreground' },
  { key: 'high', label: 'High', className: 'bg-hold-muted', text: 'text-hold-muted-foreground' },
  { key: 'medium', label: 'Medium', className: 'bg-hold-muted', text: 'text-hold-muted-foreground' },
  { key: 'low', label: 'Low', className: 'bg-premium-muted', text: 'text-primary' },
];
const BULK = ['approve', 'reject', 'escalate', 'remove_content'];
const isOpenReport = (r) => r.status === 'pending' || r.status === 'escalated';
const snippet = (text, n = 100) => {
  if (!text) return '';
  return text.length > n ? `${text.slice(0, n)}...` : text;
};

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ModerationQueue() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [filters, setFilters] = useState({ status: 'open', severity: '', reason: '', target_type: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, counts: EMPTY_COUNTS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [reviewId, setReviewId] = useState(null);
  const [bulk, setBulk] = useState(null); // { action, reason }
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE, status: filters.status || 'all' };
      for (const k of ['severity', 'reason', 'target_type']) if (filters[k]) params[k] = filters[k];
      if (q) params.q = q;
      const res = await moderationApi.list(params);
      setData({ items: res.items || [], total: res.total || 0, counts: { ...EMPTY_COUNTS, ...(res.counts || {}) } });
      setSelected(new Set());
    } catch (e) {
      setError(isMigrationPending(e)
        ? 'Content moderation needs a pending database update (migration 019). Ask an engineer to apply it, then reload.'
        : moderationErrorMessage(e, 'Could not load moderation reports.'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q]);

  const setFilter = (key) => (e) => { setPage(1); setFilters((f) => ({ ...f, [key]: e.target.value })); };
  const selectable = useMemo(() => data.items.filter(isOpenReport), [data.items]);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)));
  const pages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));

  const runBulk = async () => {
    if (!bulk) return;
    if (bulk.action === 'remove_content' && !bulk.reason.trim()) {
      toast.error('A reason is required to remove content.');
      return;
    }
    setBulkBusy(true);
    try {
      const res = await moderationApi.bulk({ ids: [...selected], action: bulk.action, reason: bulk.reason.trim() || undefined });
      if (res.failed) toast.warning(`${res.succeeded} done, ${res.failed} could not be changed.`);
      else toast.success(`${ACTION_LABELS[bulk.action]}: ${res.succeeded} report(s).`);
      setBulk(null);
      load();
    } catch (e) {
      toast.error(moderationErrorMessage(e, 'Could not apply the bulk action.'));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3" aria-label="Report counters">
        {COUNTERS.map((c) => (
          <div key={c.key} className={`${c.className} p-3 rounded-lg`}>
            <p className={`text-xs ${c.text}`}>{c.label}</p>
            <p className={`text-lg font-bold ${c.text}`} data-testid={`count-${c.key}`}>{data.counts[c.key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
          <Input
            aria-label="Search reports"
            placeholder="Search by user, content, note or violation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select aria-label="Status" className={NATIVE_SELECT_CLASS} value={filters.status} onChange={setFilter('status')}>
          <option value="open">Open (pending + escalated)</option>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select aria-label="Severity" className={NATIVE_SELECT_CLASS} value={filters.severity} onChange={setFilter('severity')}>
          <option value="">All severity</option>
          {Object.entries(SEVERITY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select aria-label="Violation" className={NATIVE_SELECT_CLASS} value={filters.reason} onChange={setFilter('reason')}>
          <option value="">All violations</option>
          {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Content type" className={NATIVE_SELECT_CLASS} value={filters.target_type} onChange={setFilter('target_type')}>
          <option value="">All content</option>
          {Object.entries(TARGET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-premium-muted p-3" role="region" aria-label="Bulk actions">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          {BULK.map((a) => (
            <Button key={a} size="sm" variant={a === 'remove_content' ? 'destructive' : 'outline'} onClick={() => setBulk({ action: a, reason: '' })}>
              {ACTION_LABELS[a]}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {error ? (
        <div className="rounded-lg bg-sell-muted text-sell-muted-foreground p-4 text-sm flex items-start gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error} <Button variant="link" className="px-1 h-auto" onClick={load}>Try again</Button></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Reported and flagged content</caption>
            <thead className="text-xs text-subtle uppercase bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-3 w-8">
                  <input type="checkbox" className="h-4 w-4 accent-primary" aria-label="Select all open reports on this page" checked={allSelected} onChange={toggleAll} disabled={!selectable.length} />
                </th>
                <th scope="col" className="px-4 py-3">Violation details</th>
                <th scope="col" className="px-4 py-3">User &amp; content</th>
                <th scope="col" className="px-4 py-3">Severity</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Reported</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center p-8 text-muted-foreground" role="status"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Loading moderation reports...</td></tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <Shield className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No moderation reports</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.counts.total === 0 ? 'Nothing has been reported or flagged yet.' : 'Try adjusting your search or filters.'}
                    </p>
                  </td>
                </tr>
              ) : data.items.map((r) => {
                const sev = SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.medium;
                const st = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                const label = decisionLabel(r);
                const when = new Date(r.created_at);
                return (
                  <tr key={r.id} className="bg-white border-b hover:bg-surface-2 transition-colors">
                    <td className="px-3 py-4 align-top">
                      {isOpenReport(r) && (
                        <input type="checkbox" className="h-4 w-4 accent-primary" aria-label={`Select report ${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-foreground">{REASON_LABELS[r.reason] || r.reason}</div>
                      <div className="text-xs text-muted-foreground">{TARGET_LABELS[r.target_type] || r.target_type}{r.source === 'auto' ? ' · auto-flag' : ''}</div>
                      {label && (
                        <div className="text-xs text-muted-foreground">Action: <span className="font-medium">{label}</span></div>
                      )}
                      {r.room?.name && <div className="text-xs text-muted-foreground">Room: {r.room.name}</div>}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium">{r.target_user?.name || 'Unknown user'}</span>
                      </div>
                      {r.content_snapshot && (
                        <div className="text-xs text-subtle max-w-xs mt-2 bg-surface-2 p-2 rounded border-l-2 border-border break-words">
                          &ldquo;{snippet(r.content_snapshot)}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top"><Badge className={`${sev.className} border-0`}>{sev.label}</Badge></td>
                    <td className="px-4 py-4 align-top"><Badge className={`${st.className} border-0`}>{st.label}</Badge></td>
                    <td className="px-4 py-4 align-top text-muted-foreground whitespace-nowrap">
                      {when.toLocaleDateString()}
                      <div className="text-xs">{when.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-right">
                      <Button variant="outline" size="sm" onClick={() => setReviewId(r.id)} aria-label={`Review report about ${r.target_user?.name || 'unknown user'}`}>
                        <Eye className="w-4 h-4 mr-1" aria-hidden="true" /> Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && data.total > PAGE_SIZE && (
        <nav className="flex items-center justify-between text-sm" aria-label="Report pages">
          <span className="text-muted-foreground">Page {page} of {pages} · {data.total} reports</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </nav>
      )}

      {renderReviewPanel(reviewId, () => setReviewId(null), load)}

      <Dialog open={Boolean(bulk)} onOpenChange={(o) => { if (!o && !bulkBusy) setBulk(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulk ? `${ACTION_LABELS[bulk.action]}: ${selected.size} report(s)` : ''}</DialogTitle>
            <DialogDescription>
              {bulk?.action === 'remove_content'
                ? 'The reported content will be hidden from everyone and each author will be told why.'
                : 'Each report is decided and logged separately.'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="bulk-reason">{bulk?.action === 'remove_content' ? 'Reason (shown to the authors)' : 'Note (optional)'}</Label>
            <Textarea id="bulk-reason" rows={3} className="mt-1" value={bulk?.reason || ''} onChange={(e) => setBulk((b) => ({ ...b, reason: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulk(null)} disabled={bulkBusy}>Cancel</Button>
            <Button variant={bulk?.action === 'remove_content' ? 'destructive' : 'default'} onClick={runBulk} disabled={bulkBusy}>
              {bulkBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              Apply to {selected.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ContentModeration() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
            Content Moderation &amp; Safety
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="queue">
            <TabsList>
              <TabsTrigger value="queue">Reports queue</TabsTrigger>
              <TabsTrigger value="history">Moderation history</TabsTrigger>
            </TabsList>
            <TabsContent value="queue" className="mt-4"><ModerationQueue /></TabsContent>
            <TabsContent value="history" className="mt-4"><ModerationHistory /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
