import { useCallback, useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { moderationApi, moderationErrorMessage, isMigrationPending } from '@/lib/moderationApi';
import { ACTION_LABELS, NATIVE_SELECT_CLASS, TARGET_LABELS, formatDateTime } from './constants';

const PAGE_SIZE = 20;

function detailText(a) {
  const d = a.details || {};
  const parts = [];
  if (d.days) parts.push(`${d.days} day(s)`);
  if (d.ends_at) parts.push(`until ${formatDateTime(d.ends_at)}`);
  if (d.removed) parts.push('content removed');
  if (d.closed_reports) parts.push(`${d.closed_reports} related report(s) closed`);
  if (d.bulk) parts.push('bulk');
  return parts.join(' · ');
}

/** Every moderation decision (moderation_actions), newest first. */
export default function ModerationHistory() {
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = new Date(`${filters.from}T00:00:00`).toISOString();
      if (filters.to) params.to = new Date(`${filters.to}T23:59:59`).toISOString();
      setData(await moderationApi.history(params));
    } catch (e) {
      setError(isMigrationPending(e)
        ? 'Moderation history needs a pending database update (migration 019).'
        : moderationErrorMessage(e, 'Could not load the moderation history.'));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key) => (e) => { setPage(1); setFilters((f) => ({ ...f, [key]: e.target.value })); };
  const pages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div>
          <Label htmlFor="history-action">Action</Label>
          <select id="history-action" className={`${NATIVE_SELECT_CLASS} mt-1 w-full md:w-48`} value={filters.action} onChange={setFilter('action')}>
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="history-from">From</Label>
          <Input id="history-from" type="date" className="mt-1" value={filters.from} onChange={setFilter('from')} />
        </div>
        <div>
          <Label htmlFor="history-to">To</Label>
          <Input id="history-to" type="date" className="mt-1" value={filters.to} onChange={setFilter('to')} />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-sell-muted text-sell-muted-foreground p-4 text-sm" role="alert">
          {error} <Button variant="link" className="px-1" onClick={load}>Try again</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Moderation history</caption>
            <thead className="text-xs text-subtle uppercase bg-surface-2">
              <tr>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Admin</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3">Target</th>
                <th scope="col" className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-muted-foreground"><Loader2 className="inline w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Loading history...</td></tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8">
                    <History className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-2 text-sm text-muted-foreground">No moderation actions recorded{filters.action || filters.from || filters.to ? ' for these filters' : ' yet'}.</p>
                  </td>
                </tr>
              ) : data.items.map((a) => (
                <tr key={a.id || `${a.report_id}-${a.created_at}`} className="border-b">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(a.created_at)}</td>
                  <td className="px-4 py-3">{a.moderator?.name || 'Unknown admin'}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{ACTION_LABELS[a.action] || a.action}</span>
                    {detailText(a) && <div className="text-xs text-muted-foreground">{detailText(a)}</div>}
                  </td>
                  <td className="px-4 py-3">{a.target_user?.name || '-'}</td>
                  <td className="px-4 py-3">{TARGET_LABELS[a.target_type] || a.target_type || '-'}</td>
                  <td className="px-4 py-3 max-w-xs break-words">{a.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && data.total > PAGE_SIZE && (
        <nav className="flex items-center justify-between text-sm" aria-label="History pages">
          <span className="text-muted-foreground">Page {page} of {pages} · {data.total} actions</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </nav>
      )}
    </div>
  );
}
