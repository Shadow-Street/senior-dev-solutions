import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, ArchiveRestore, Lock, Unlock, Trash2, Download, Upload, Search, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { PLANS, apiError, csvToRooms, downloadText, messagesToCsv, toCsv } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import PropTypes from 'prop-types';

const MAX_EXPORT_PAGES = 20; // 20 x 100 messages per room

/** Bulk room actions, CSV import of new rooms, and message export. */
export default function BulkOperationsPanel({ rooms, onChanged }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [plan, setPlan] = useState('premium');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => !q || `${r.name} ${r.stock_symbol || ''}`.toLowerCase().includes(q));
  }, [rooms, search]);
  const selectedSet = new Set(selected);
  const allShown = shown.length > 0 && shown.every((r) => selectedSet.has(r.id));

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allShown ? selected.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...selected, ...shown.map((r) => r.id)])]);

  const runBulk = async (action, extra = {}) => {
    if (!selected.length) { toast.error('Select at least one room'); return; }
    setBusy(action);
    try {
      const res = await chatAdminApi.bulk({ ids: selected, action, ...extra });
      if (res.failed) {
        const reasons = [...new Set(res.results.filter((r) => !r.ok).map((r) => r.error))].join('; ');
        toast.warning(`${res.succeeded} done, ${res.failed} failed: ${reasons}`);
      } else {
        toast.success(`${res.succeeded} room${res.succeeded === 1 ? '' : 's'} updated`);
      }
      if (action === 'delete') setSelected([]);
      await onChanged();
    } catch (e) {
      toast.error(apiError(e, 'Bulk action failed'));
    } finally {
      setBusy(null);
    }
  };

  const exportMessages = async () => {
    if (!selected.length) { toast.error('Select at least one room'); return; }
    setBusy('export');
    try {
      const rows = [];
      for (const id of selected) {
        const room = rooms.find((r) => r.id === id);
        let before;
        let beforeId;
        for (let page = 0; page < MAX_EXPORT_PAGES; page += 1) {
          const res = await chatAdminApi.messages(id, { limit: 100, before, before_id: beforeId });
          rows.push({ room, messages: res.messages });
          if (!res.has_more || !res.messages.length) break;
          const last = res.messages[res.messages.length - 1];
          before = last.created_at || last.created_date;
          beforeId = last.id;
        }
      }
      const csv = rows.map(({ room, messages }, i) => {
        const text = messagesToCsv(room?.name || '', messages);
        return i === 0 ? text : text.split('\r\n').slice(1).join('\r\n');
      }).filter(Boolean).join('\r\n');
      const total = rows.reduce((n, r) => n + r.messages.length, 0);
      if (!total) { toast.error('The selected rooms have no messages'); return; }
      downloadText(`chat-messages-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`Exported ${total} messages`);
    } catch (e) {
      toast.error(apiError(e, 'Export failed'));
    } finally {
      setBusy(null);
    }
  };

  const importCsv = async (file) => {
    if (!file) return;
    if (file.size > 512 * 1024) { toast.error('CSV must be under 512 KB'); return; }
    const { rooms: toCreate, errors } = csvToRooms(await file.text());
    if (!toCreate.length) { setImportResult({ created: 0, failed: errors }); toast.error(errors[0] || 'No rooms in the file'); return; }
    setBusy('import');
    const failed = [...errors];
    let created = 0;
    for (const room of toCreate) {
      try {
        await chatAdminApi.createRoom(room);
        created += 1;
      } catch (e) {
        failed.push(`${room.name}: ${apiError(e, 'failed')}`);
      }
    }
    setImportResult({ created, failed });
    setBusy(null);
    if (created) { toast.success(`Created ${created} room${created === 1 ? '' : 's'}`); await onChanged(); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = () => downloadText('chat-rooms-template.csv', toCsv(
    ['name', 'description', 'room_type', 'stock_symbol', 'required_plan', 'is_public', 'admin_only_post'],
    [['RELIANCE', 'Reliance Industries discussion', 'stock_specific', 'RELIANCE', 'free', 'true', 'false'],
      ['VIP Strategy Lounge', 'For VIP members', 'premium', '', 'vip', 'true', 'false']],
  ));

  const disabled = Boolean(busy);
  const spin = (key) => busy === key && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Bulk actions on selected rooms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">{selected.length} selected</Badge>
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('archive')}>{spin('archive') || <Archive className="w-4 h-4 mr-2" aria-hidden="true" />}Archive</Button>
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('restore')}>{spin('restore') || <ArchiveRestore className="w-4 h-4 mr-2" aria-hidden="true" />}Restore</Button>
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('lock')}>{spin('lock') || <Lock className="w-4 h-4 mr-2" aria-hidden="true" />}Lock</Button>
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('unlock')}>{spin('unlock') || <Unlock className="w-4 h-4 mr-2" aria-hidden="true" />}Unlock</Button>
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('set_posting', { value: true })}>Moderators-only posting</Button>
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('set_posting', { value: false })}>Everyone can post</Button>
            <div className="flex items-center gap-1">
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-28 h-9" aria-label="Plan to apply"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={disabled} onClick={() => runBulk('set_plan', { value: plan })}>{spin('set_plan')}Set plan</Button>
            </div>
            <Button size="sm" variant="outline" disabled={disabled} onClick={exportMessages}>{spin('export') || <Download className="w-4 h-4 mr-2" aria-hidden="true" />}Export messages</Button>
            <Button size="sm" variant="destructive" disabled={disabled || !selected.length} onClick={() => setConfirmDelete(true)}><Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />Delete</Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
            <Input aria-label="Filter rooms" placeholder="Filter rooms…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-subtle sticky top-0">
                <tr>
                  <th scope="col" className="px-4 py-2 w-10"><Checkbox aria-label="Select all shown rooms" checked={allShown} onCheckedChange={toggleAll} /></th>
                  <th scope="col" className="px-4 py-2 text-left">Room</th>
                  <th scope="col" className="px-4 py-2 text-left">State</th>
                  <th scope="col" className="px-4 py-2 text-left">Messages</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-subtle">No rooms.</td></tr>
                ) : shown.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2"><Checkbox aria-label={`Select ${r.name}`} checked={selectedSet.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-xs">{r.status === 'archived' ? 'Archived' : r.locked ? 'Locked' : 'Active'}</td>
                    <td className="px-4 py-2 text-xs">{r.message_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Import rooms from CSV</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Header row with <code>name</code> (required) and optionally <code>description, room_type, stock_symbol, required_plan, is_public, admin_only_post</code>. Each row is validated by the server like the Create Room form.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}><FileText className="w-4 h-4 mr-2" aria-hidden="true" />Download template</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" id="bulk-import" onChange={(e) => importCsv(e.target.files?.[0])} />
            <Button size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>{spin('import') || <Upload className="w-4 h-4 mr-2" aria-hidden="true" />}Choose CSV…</Button>
          </div>
          {importResult && (
            <div className="text-sm space-y-1" role="status">
              <p>Created {importResult.created} room(s).</p>
              {importResult.failed.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-sell-muted-foreground">{importResult.failed.slice(0, 20).map((f) => <li key={f}>{f}</li>)}</ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => { await runBulk('delete', { confirm: 'DELETE' }); setConfirmDelete(false); }}
        destructive
        title={`Delete ${selected.length} room(s) permanently?`}
        description="Their messages, participants, invites, rules and schedules are removed. Rooms with active paid subscriptions are skipped. This cannot be undone; archiving keeps the history."
        requireText="DELETE"
        confirmLabel="Delete rooms"
      />
    </div>
  );
}

BulkOperationsPanel.propTypes = {
  rooms: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
};
