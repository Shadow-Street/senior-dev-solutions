import { useCallback, useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Search, VolumeX, Ban, UserCheck, Clock, MessageSquare, UserMinus, Loader2, AlertTriangle, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { apiError, formatDateTime } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import UserPicker from './UserPicker';
import PropTypes from 'prop-types';

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Room admin' },
];

/** Participants of one room: add, change role, mute, remove, ban / unban. */
export default function ParticipantManagementModal({ room, onClose, onChanged }) {
  const open = Boolean(room);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [addRole, setAddRole] = useState('member');
  const [confirm, setConfirm] = useState(null); // { kind: 'remove'|'ban', participant }

  const load = useCallback(async () => {
    if (!room) return;
    try {
      setError(null);
      setData(await chatAdminApi.participants(room.id));
    } catch (e) {
      setError(apiError(e, 'Could not load participants'));
    }
  }, [room]);

  useEffect(() => {
    if (open) { setData(null); setSearch(''); load(); }
  }, [open, room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key, fn, success) => {
    setBusyId(key);
    try {
      await fn();
      toast.success(success);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(apiError(e, 'Action failed'));
    } finally {
      setBusyId(null);
    }
  };

  const participants = data?.participants || [];
  const bans = data?.bans || [];
  const q = search.trim().toLowerCase();
  const shown = q
    ? participants.filter((p) => `${p.user?.name || ''} ${p.user?.email || ''}`.toLowerCase().includes(q))
    : participants;

  const addUser = (user) => run(`add-${user.id}`, () => chatAdminApi.addParticipant(room.id, user.id, addRole), `${user.name} added as ${addRole}`);

  const onConfirm = async ({ reason }) => {
    const { kind, participant } = confirm;
    const name = participant.user?.name || 'User';
    if (kind === 'remove') {
      await run(participant.user_id, () => chatAdminApi.removeParticipant(room.id, participant.user_id), `${name} removed from the room`);
    } else {
      await run(participant.user_id, () => chatAdminApi.ban(room.id, participant.user_id, reason), `${name} banned from the room`);
    }
    setConfirm(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" aria-hidden="true" />
              Participants — {room?.name}
            </DialogTitle>
            <DialogDescription>
              Removing or banning someone disconnects them from the live room at once. Mutes stop them posting until lifted.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center justify-between rounded-lg border border-sell/30 bg-sell-muted px-4 py-3 text-sm text-sell-muted-foreground" role="alert">
              <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error}</span>
              <Button size="sm" variant="outline" onClick={load}>Retry</Button>
            </div>
          )}

          {!data && !error && (
            <div className="py-12 text-center text-subtle" role="status"><Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" aria-hidden="true" />Loading participants…</div>
          )}

          {data && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ['Participants', participants.length],
                  ['Moderators', participants.filter((p) => ['moderator', 'admin', 'owner'].includes(p.role)).length],
                  ['Online now', participants.filter((p) => p.online).length],
                  ['Muted', participants.filter((p) => p.muted).length],
                  ['Banned', bans.length],
                ].map(([label, value]) => (
                  <div key={label} className="bg-surface-2 p-3 rounded-lg">
                    <p className="text-xs text-subtle">{label}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4" aria-hidden="true" /> Add someone</h4>
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger className="w-40" aria-label="Role for the added user"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {room?.status === 'archived'
                  ? <p className="text-xs text-muted-foreground">Restore this room before adding people.</p>
                  : <UserPicker id="add-participant" onSelect={addUser} excludeIds={[...participants.map((p) => p.user_id), ...bans.map((b) => b.user_id)]} disabled={Boolean(busyId)} />}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
                <Input aria-label="Filter participants" placeholder="Filter participants…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-xs text-subtle uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Participant</th>
                      <th scope="col" className="px-4 py-3 text-left">Role</th>
                      <th scope="col" className="px-4 py-3 text-left">Status</th>
                      <th scope="col" className="px-4 py-3 text-left">Activity</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-subtle">{participants.length ? 'No participants match.' : 'Nobody has joined this room yet.'}</td></tr>
                    ) : shown.map((p) => {
                      const busy = busyId === p.user_id;
                      const isOwner = p.role === 'owner';
                      return (
                        <tr key={p.id} className="border-b">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{p.user?.name}</p>
                            <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            {isOwner ? <Badge>Owner</Badge> : (
                              <Select
                                value={p.role}
                                disabled={busy}
                                onValueChange={(role) => run(p.user_id, () => chatAdminApi.updateParticipant(room.id, p.user_id, { role }), `Role changed to ${role}`)}
                              >
                                <SelectTrigger className="w-36 h-8" aria-label={`Role of ${p.user?.name}`}><SelectValue /></SelectTrigger>
                                <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-4 py-3 space-x-1">
                            {p.online && <Badge className="bg-buy-muted text-buy-muted-foreground border-0">Online</Badge>}
                            {p.muted && <Badge className="bg-hold-muted text-hold-muted-foreground border-0"><VolumeX className="w-3 h-3 mr-1" aria-hidden="true" />Muted</Badge>}
                            {!p.online && !p.muted && <span className="text-xs text-muted-foreground">Offline</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-subtle space-y-1">
                            <div className="flex items-center gap-1"><MessageSquare className="w-3 h-3" aria-hidden="true" />{p.message_count} messages</div>
                            <div className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />Joined {formatDateTime(p.joined_at)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-label="Working" />}
                              <Button
                                variant="ghost" size="sm" disabled={busy}
                                onClick={() => run(p.user_id, () => chatAdminApi.updateParticipant(room.id, p.user_id, { muted: !p.muted }), p.muted ? 'Unmuted' : 'Muted')}
                              >
                                {p.muted ? <><UserCheck className="w-4 h-4 mr-1" aria-hidden="true" />Unmute</> : <><VolumeX className="w-4 h-4 mr-1" aria-hidden="true" />Mute</>}
                              </Button>
                              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm({ kind: 'remove', participant: p })}>
                                <UserMinus className="w-4 h-4 mr-1" aria-hidden="true" />Remove
                              </Button>
                              {!isOwner && (
                                <Button variant="ghost" size="sm" disabled={busy} className="text-sell-muted-foreground" onClick={() => setConfirm({ kind: 'ban', participant: p })}>
                                  <Ban className="w-4 h-4 mr-1" aria-hidden="true" />Ban
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {bans.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Ban className="w-4 h-4" aria-hidden="true" /> Banned from this room</h4>
                  <ul className="divide-y border rounded-lg">
                    {bans.map((b) => (
                      <li key={b.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <div>
                          <p className="text-sm font-medium">{b.user?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.reason ? `Reason: ${b.reason} · ` : ''}Banned {formatDateTime(b.banned_at)}
                          </p>
                        </div>
                        <Button
                          size="sm" variant="outline" disabled={busyId === b.user_id}
                          onClick={() => run(b.user_id, () => chatAdminApi.unban(room.id, b.user_id), 'Ban lifted')}
                        >
                          Unban
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={onConfirm}
        destructive
        title={confirm?.kind === 'ban' ? `Ban ${confirm?.participant.user?.name}?` : `Remove ${confirm?.participant.user?.name}?`}
        description={confirm?.kind === 'ban'
          ? 'They are removed now and cannot rejoin, read or post in this room until unbanned. Their account elsewhere is not affected (use User Management for platform-wide action).'
          : 'They are removed from the room now. If the room is public they can join again.'}
        reasonLabel={confirm?.kind === 'ban' ? 'Reason (optional, kept in the audit log)' : null}
        confirmLabel={confirm?.kind === 'ban' ? 'Ban from room' : 'Remove'}
      />
    </>
  );
}

ParticipantManagementModal.propTypes = {
  room: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};
