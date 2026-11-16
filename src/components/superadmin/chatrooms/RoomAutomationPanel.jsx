import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Edit, Trash2, Loader2, AlertTriangle, Megaphone, Lock, Unlock, Archive } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { apiError, formatDateTime } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import PropTypes from 'prop-types';

const ACTIONS = {
  send_message: { label: 'Post an announcement', icon: Megaphone },
  lock_room: { label: 'Lock the room', icon: Lock },
  unlock_room: { label: 'Unlock the room', icon: Unlock },
  archive_room: { label: 'Archive the room', icon: Archive },
};
const RECURRENCE = { once: 'Once', daily: 'Every day', weekly: 'Every week' };

/** <input type="datetime-local"> value for a Date, in local time. */
const toLocalInput = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

const blank = () => ({ chat_room_id: '', action_type: 'send_message', run_at: toLocalInput(Date.now() + 3600e3), recurrence: 'once', message: '' });

/**
 * Scheduled room actions. The server runs due schedules every minute
 * (services/RoomAutomationService) and records each run in the audit log.
 */
export default function RoomAutomationPanel({ rooms }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | automation
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await chatAdminApi.automations());
    } catch (e) {
      setError(apiError(e, 'Could not load schedules'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(blank()); setEditing('new'); };
  const openEdit = (a) => {
    // A schedule whose time has passed needs a new time; never re-run it as-is.
    const when = a.config?.next_run_at || a.config?.run_at;
    const future = when && new Date(when).getTime() > Date.now() ? when : Date.now() + 3600e3;
    setForm({
      chat_room_id: a.chat_room_id, action_type: a.action_type, run_at: toLocalInput(future),
      recurrence: a.config?.recurrence || 'once', message: a.config?.message || '',
    });
    setEditing(a);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.chat_room_id) { toast.error('Choose a room'); return; }
    if (!form.run_at) { toast.error('Choose when it should run'); return; }
    if (form.action_type === 'send_message' && !form.message.trim()) { toast.error('Enter the announcement text'); return; }
    const payload = {
      chat_room_id: form.chat_room_id,
      action_type: form.action_type,
      config: { run_at: new Date(form.run_at).toISOString(), recurrence: form.recurrence, message: form.message.trim() },
    };
    setSaving(true);
    try {
      if (editing === 'new') await chatAdminApi.createAutomation(payload);
      else await chatAdminApi.updateAutomation(editing.id, { ...payload, is_active: true });
      toast.success(editing === 'new' ? 'Schedule created' : 'Schedule updated');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(apiError(err, 'Failed to save the schedule'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a) => {
    try {
      await chatAdminApi.updateAutomation(a.id, { is_active: !a.is_active });
      toast.success(a.is_active ? 'Schedule paused' : 'Schedule resumed');
      await load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update the schedule'));
    }
  };

  const remove = async () => {
    try {
      await chatAdminApi.deleteAutomation(deleting.id);
      toast.success('Schedule deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete the schedule'));
    }
  };

  const roomName = (id) => rooms.find((r) => r.id === id)?.name || 'Deleted room';
  const activeRooms = rooms.filter((r) => r.status !== 'archived');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-4 flex-1 min-w-[18rem]">
          {[
            ['Active', items ? items.filter((a) => a.is_active).length : '—'],
            ['Recurring', items ? items.filter((a) => a.config?.recurrence && a.config.recurrence !== 'once').length : '—'],
            ['Announcements', items ? items.filter((a) => a.action_type === 'send_message').length : '—'],
          ].map(([label, value]) => (
            <Card key={label}><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-subtle">{label}</p></CardContent></Card>
          ))}
        </div>
        <Button onClick={openNew} disabled={!activeRooms.length}><Plus className="w-4 h-4 mr-2" aria-hidden="true" />New schedule</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" aria-hidden="true" />Scheduled actions</CardTitle></CardHeader>
        <CardContent>
          {error && <p className="text-sm text-sell-muted-foreground flex items-center gap-2" role="alert"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></p>}
          {!items && !error && <p className="text-sm text-subtle" role="status"><Loader2 className="w-4 h-4 inline animate-spin mr-1" aria-hidden="true" />Loading…</p>}
          {items && items.length === 0 && <p className="text-sm text-subtle text-center py-8">No schedules yet. Schedule an announcement, or lock a room outside market hours.</p>}
          {items && items.length > 0 && (
            <ul className="divide-y">
              {items.map((a) => {
                const A = ACTIONS[a.action_type] || ACTIONS.send_message;
                return (
                  <li key={a.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <A.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span className="font-medium">{A.label}</span>
                        <Badge variant="outline">{roomName(a.chat_room_id)}</Badge>
                        <Badge variant="outline">{RECURRENCE[a.config?.recurrence] || 'Once'}</Badge>
                        {!a.is_active && <Badge className="bg-surface-2 text-subtle">{a.config?.next_run_at ? 'Paused' : 'Done'}</Badge>}
                        {a.config?.last_outcome === 'failed' && <Badge className="bg-sell-muted text-sell-muted-foreground">Last run failed</Badge>}
                      </div>
                      {a.config?.message && <p className="text-sm text-subtle mt-1 break-words">“{a.config.message}”</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Next: {a.is_active && a.config?.next_run_at ? formatDateTime(a.config.next_run_at) : '—'} · Last run: {formatDateTime(a.last_triggered_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch aria-label={a.is_active ? 'Pause schedule' : 'Resume schedule'} checked={Boolean(a.is_active)} disabled={!a.config?.next_run_at} onCheckedChange={() => toggle(a)} />
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)} aria-label="Edit schedule"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(a)} className="text-sell-muted-foreground" aria-label="Delete schedule"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => { if (!o && !saving) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing === 'new' ? 'New schedule' : 'Edit schedule'}</DialogTitle>
              <DialogDescription>Runs within a minute of the chosen time (server time zone shown in your local time).</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="auto-room">Room</Label>
              <Select value={form.chat_room_id} onValueChange={(v) => setForm({ ...form, chat_room_id: v })}>
                <SelectTrigger id="auto-room" className="mt-1"><SelectValue placeholder="Choose a room" /></SelectTrigger>
                <SelectContent>{activeRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="auto-action">Action</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger id="auto-action" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACTIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="auto-time">When</Label>
                <Input id="auto-time" type="datetime-local" className="mt-1" value={form.run_at} onChange={(e) => setForm({ ...form, run_at: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="auto-repeat">Repeat</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger id="auto-repeat" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RECURRENCE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.action_type === 'send_message' && (
              <div>
                <Label htmlFor="auto-message">Announcement</Label>
                <Textarea id="auto-message" className="mt-1 h-24" maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Posted as a system message from you.</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        destructive
        title="Delete this schedule?"
        description="It will not run again. Past runs stay in the audit log."
        confirmLabel="Delete"
      />
    </div>
  );
}

RoomAutomationPanel.propTypes = {
  rooms: PropTypes.array.isRequired,
};
