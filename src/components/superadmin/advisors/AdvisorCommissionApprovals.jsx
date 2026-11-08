import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, AlertTriangle, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiClient, { Advisor } from '@/lib/apiClient';
import { apiErrorMessage } from '@/lib/withdrawalsApi';
import { commissionParts } from '@/lib/payoutView';
import { formatInr, formatDateTime } from '@/components/advisors/finance/withdrawalStatus';

/**
 * Staff queue for commissions created from verified advisor-plan payments.
 * Approving a commission is what makes it count towards the advisor's
 * withdrawable balance (the server enforces staff-only; this is the control).
 * Owns its data (no props).
 */
export default function AdvisorCommissionApprovals() {
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [{ data }, advisors] = await Promise.all([
        apiClient.get('/commissions/tracking', { params: { status: 'pending', limit: 100 } }),
        Advisor.list().catch(() => []),
      ]);
      setRows(Array.isArray(data) ? data.filter((r) => r.advisor_id) : []);
      setNames(Object.fromEntries((advisors || []).map((a) => [a.id, a.display_name || a.name || a.id])));
      setSelected(new Set());
    } catch (e) {
      setLoadError(apiErrorMessage(e, 'Could not load pending commissions.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSelected((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const decide = async (action, ids) => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await apiClient.post(`/commissions/tracking/${action}`, { ids });
      toast.success(action === 'approve' ? `${ids.length} commission(s) approved` : `${ids.length} commission(s) cancelled`);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The change could not be applied.'));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><BadgeCheck className="w-5 h-5" /> Commissions awaiting approval</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy || selected.size === 0} onClick={() => decide('cancel', [...selected])}>
              <XCircle className="w-4 h-4 mr-1" /> Cancel selected
            </Button>
            <Button size="sm" disabled={busy || selected.size === 0} className="bg-buy text-buy-foreground hover:bg-buy-soft" onClick={() => decide('approve', [...selected])}>
              <CheckCircle className="w-4 h-4 mr-1" /> Approve selected ({selected.size})
            </Button>
          </div>
        </div>
        <p className="text-sm text-subtle">Only approved commissions count towards an advisor&apos;s available balance for withdrawals.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-6" role="status" aria-label="Loading commissions"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {!isLoading && loadError && (
          <div className="text-center py-4 space-y-2">
            <AlertTriangle className="w-8 h-8 text-sell-muted-foreground mx-auto" />
            <p className="text-subtle">{loadError}</p>
            <Button size="sm" variant="outline" onClick={load}>Try again</Button>
          </div>
        )}
        {!isLoading && !loadError && rows.length === 0 && <p className="text-center text-subtle py-4">No commissions are waiting for approval.</p>}
        {!isLoading && !loadError && rows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-subtle">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} />
            Select all
          </label>
        )}
        {!isLoading && !loadError && rows.map((r) => {
          const { gross, fee, net } = commissionParts(r);
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select commission ${r.reference_id || r.id}`} />
                <span>
                  <span className="font-semibold text-foreground">{names[r.advisor_id] || 'Unknown advisor'} · {formatInr(net)}</span>
                  <span className="block text-xs text-subtle">
                    {formatDateTime(r.created_at)}{gross ? ` · paid ${formatInr(gross)}, platform ${formatInr(fee)}` : ''}{r.reference_id ? ` · ${r.reference_id}` : ''}
                  </span>
                </span>
              </label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('cancel', [r.id])}>Cancel</Button>
                <Button size="sm" disabled={busy} className="bg-buy text-buy-foreground hover:bg-buy-soft" onClick={() => decide('approve', [r.id])}>Approve</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
