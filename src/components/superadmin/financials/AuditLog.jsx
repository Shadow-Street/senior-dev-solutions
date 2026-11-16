import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { financialsApi } from '@/lib/financialsApi';
import { formatDateTime } from '@/lib/format';
import { DataView, useFinanceData, inr, DataTable, EmptyRows, Pager } from './shared';

const LIMIT = 50;

/** Short readable summary of an entry's details (JSON written by the server). */
function summary(details) {
  if (!details || typeof details !== 'object') return typeof details === 'string' ? details : '';
  const parts = [];
  for (const key of ['status', 'reason', 'payment_id', 'razorpay_refund_id', 'category', 'description', 'source']) {
    if (details[key]) parts.push(`${key.replace(/_/g, ' ')}: ${details[key]}`);
  }
  if (details.summary && typeof details.summary === 'object') {
    parts.push(Object.entries(details.summary).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', '));
  }
  return parts.join(' · ');
}

/** Financial audit trail: written only by the server, read-only here. */
export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const query = useFinanceData(() => financialsApi.auditLogs({ limit: LIMIT, offset }), [offset]);
  return (
    <Card className="shadow-sm border bg-white">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" /> Financial audit log</CardTitle>
        <CardDescription>Every refund decision, reconciliation run and expense or income change, recorded by the server.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <DataView query={query} loadingLabel="Loading audit log…">
          {(data) => (data.items.length === 0 ? <EmptyRows title="No audit entries yet" /> : (
            <>
              <DataTable caption="Financial audit log" head={['When', 'Admin', 'Action', 'Record', 'Amount', 'Details']}>
                {data.items.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.created_at || log.created_date)}</td>
                    <td className="px-4 py-3">{log.admin_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-xs">{log.entity_type}{log.entity_id && <span className="block font-mono text-muted-foreground break-all">{log.entity_id}</span>}</td>
                    <td className="px-4 py-3">{log.amount === null || log.amount === undefined ? '—' : inr(log.amount)}</td>
                    <td className="px-4 py-3 text-xs break-words max-w-md">{summary(log.details)}</td>
                  </tr>
                ))}
              </DataTable>
              <Pager total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
            </>
          ))}
        </DataView>
      </CardContent>
    </Card>
  );
}
