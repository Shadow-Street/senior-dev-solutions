import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, History, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminUsersApi, adminErrorMessage, downloadCsv } from './adminUsersApi';

const FILTERS = [
  { value: 'all', label: 'All changes' },
  { value: 'user', label: 'Users' },
  { value: 'role', label: 'Roles & permissions' },
  { value: 'role_template', label: 'Role templates' },
];

const actionLabel = (action) => String(action || '').replace(/_/g, ' ');

/** User Management and Roles & Permissions audit trail (server-written). */
export default function AuditLogViewer() {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 25 };
      if (filter !== 'all') params.entity_type = filter;
      setResult(await adminUsersApi.auditLog(params));
    } catch (e) {
      setError(adminErrorMessage(e, 'Could not load the audit log.'));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const rows = result?.data || [];

  const exportCsv = () => {
    if (!rows.length) {
      toast.info('Nothing to export.');
      return;
    }
    downloadCsv(`user-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Time', 'By', 'Action', 'Details'],
      ...rows.map((r) => [new Date(r.created_at).toISOString(), r.actor?.name || 'System', r.action, r.description || '']),
    ]);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-primary" />Audit log</CardTitle>
          <CardDescription>Every change made in User Management and Roles &amp; Permissions.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[190px]" aria-label="Filter audit log"><SelectValue /></SelectTrigger>
            <SelectContent>{FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export page</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !result && <Skeleton className="h-64 w-full" />}
        {error && (
          <div className="text-center py-10">
            <p role="alert" className="text-sell-muted-foreground mb-3">{error}</p>
            <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
          </div>
        )}
        {!error && result && rows.length === 0 && (
          <p className="text-center py-10 text-muted-foreground">No changes recorded yet.</p>
        )}
        {!error && rows.length > 0 && (
          <div className={`overflow-x-auto border rounded-lg ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-surface-2">
                <tr>
                  <th scope="col" className="px-4 py-3">Time</th>
                  <th scope="col" className="px-4 py-3">By</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{r.actor?.name || 'System'}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 capitalize">{actionLabel(r.action)}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && result.pages > 1 && (
          <div className="flex justify-end items-center gap-3 mt-4">
            <span className="text-sm text-muted-foreground">Page {result.page} of {result.pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}><ChevronLeft className="w-4 h-4" />Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= result.pages || loading}>Next<ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
