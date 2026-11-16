import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Lock, Unlock, Archive, ArchiveRestore, X, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { PLANS, apiError, normalizePlan } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import UserPicker from './UserPicker';
import PropTypes from 'prop-types';

/**
 * The row's shield button: one room's moderation and access controls —
 * archive/restore, lock/unlock, who can join (visibility, plan), who can post,
 * and the room's moderators.
 */
export default function ModeratorManager({ room, onClose, onChanged }) {
  const open = Boolean(room);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'archive' | 'lock'
  const [team, setTeam] = useState(null);

  const loadTeam = useCallback(async () => {
    if (!room) return;
    try {
      const { participants } = await chatAdminApi.participants(room.id);
      setTeam(participants.filter((p) => ['owner', 'admin', 'moderator'].includes(p.role)));
    } catch (e) {
      setTeam([]);
      toast.error(apiError(e, 'Could not load moderators'));
    }
  }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) { setTeam(null); loadTeam(); } }, [open, loadTeam]);

  const act = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      toast.success(success);
      await onChanged?.();
      return true;
    } catch (e) {
      toast.error(apiError(e, 'Action failed'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (!room) return null;
  const archived = room.status && room.status !== 'active';

  const update = (patch, success) => act(Object.keys(patch)[0], () => chatAdminApi.updateRoom(room.id, patch), success);

  const addModerator = async (user) => {
    if (await act('mod', () => chatAdminApi.addParticipant(room.id, user.id, 'moderator'), `${user.name} is now a moderator`)) loadTeam();
  };
  const demote = async (p) => {
    if (await act(p.user_id, () => chatAdminApi.updateParticipant(room.id, p.user_id, { role: 'member' }), `${p.user?.name} is now a member`)) loadTeam();
  };

  const onConfirm = async ({ reason }) => {
    if (confirm === 'archive') await act('status', () => chatAdminApi.archiveRoom(room.id), 'Room archived');
    if (confirm === 'lock') await act('lock', () => chatAdminApi.lockRoom(room.id, reason), 'Room locked');
    setConfirm(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
              Moderation & access — “{room.name}”
            </DialogTitle>
            <DialogDescription>Changes take effect at once in the live room.</DialogDescription>
          </DialogHeader>

          <section className="space-y-3" aria-labelledby="room-state-h">
            <h4 id="room-state-h" className="text-sm font-semibold text-subtle">Room state</h4>
            <div className="flex flex-wrap gap-2">
              {archived ? (
                <Button variant="outline" disabled={Boolean(busy)} onClick={() => act('status', () => chatAdminApi.restoreRoom(room.id), 'Room restored')}>
                  <ArchiveRestore className="w-4 h-4 mr-2" aria-hidden="true" />Restore room
                </Button>
              ) : (
                <Button variant="outline" disabled={Boolean(busy)} onClick={() => setConfirm('archive')}>
                  <Archive className="w-4 h-4 mr-2" aria-hidden="true" />Archive (read-only)
                </Button>
              )}
              {room.locked ? (
                <Button variant="outline" disabled={Boolean(busy)} onClick={() => act('lock', () => chatAdminApi.unlockRoom(room.id), 'Room unlocked')}>
                  <Unlock className="w-4 h-4 mr-2" aria-hidden="true" />Unlock
                </Button>
              ) : (
                <Button variant="outline" disabled={Boolean(busy) || archived} onClick={() => setConfirm('lock')}>
                  <Lock className="w-4 h-4 mr-2" aria-hidden="true" />Lock (moderators only)
                </Button>
              )}
              {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-label="Working" />}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{archived ? 'Archived — nobody can join or post' : 'Active'}</Badge>
              {room.locked && <Badge className="bg-hold-muted text-hold-muted-foreground">Locked{room.lock_reason ? `: ${room.lock_reason}` : ''}</Badge>}
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t" aria-labelledby="room-access-h">
            <h4 id="room-access-h" className="text-sm font-semibold text-subtle">Access permissions</h4>
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <div className="pr-4">
                <Label htmlFor="ctl-public" className="font-medium">Public room</Label>
                <p className="text-xs text-subtle">Off: invite only. Current outsiders are disconnected.</p>
              </div>
              <Switch id="ctl-public" checked={room.is_public !== false} disabled={Boolean(busy)} onCheckedChange={(v) => update({ is_public: v }, v ? 'Room is now public' : 'Room is now invite only')} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <div className="pr-4">
                <Label htmlFor="ctl-posting" className="font-medium">Only moderators can post</Label>
                <p className="text-xs text-subtle">Members keep reading.</p>
              </div>
              <Switch id="ctl-posting" checked={room.admin_only_post === true} disabled={Boolean(busy)} onCheckedChange={(v) => update({ admin_only_post: v }, v ? 'Posting limited to moderators' : 'Everyone can post')} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <div className="pr-4">
                <Label htmlFor="ctl-plan" className="font-medium">Plan required</Label>
                <p className="text-xs text-subtle">Members without it lose access at once (room moderators keep theirs).</p>
              </div>
              <Select value={normalizePlan(room.required_plan)} disabled={Boolean(busy)} onValueChange={(v) => update({ required_plan: v }, `Plan set to ${v}`)}>
                <SelectTrigger id="ctl-plan" className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p.value} value={p.value} disabled={['premium', 'premium_admin'].includes(room.room_type) && p.value === 'free'}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t" aria-labelledby="room-mods-h">
            <h4 id="room-mods-h" className="text-sm font-semibold text-subtle">Moderators</h4>
            {team === null ? (
              <p className="text-xs text-muted-foreground" role="status">Loading…</p>
            ) : team.length === 0 ? (
              <p className="text-xs text-muted-foreground">No room moderators yet. Staff can always moderate.</p>
            ) : (
              <ul className="space-y-2">
                {team.map((p) => (
                  <li key={p.user_id} className="flex items-center justify-between bg-surface-2 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.user?.email} · {p.role === 'admin' ? 'Room admin' : p.role === 'owner' ? 'Owner' : 'Moderator'}</p>
                    </div>
                    {p.role !== 'owner' && (
                      <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => demote(p)} aria-label={`Remove moderator rights from ${p.user?.name}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium flex items-center gap-1"><UserPlus className="w-3 h-3" aria-hidden="true" />Make someone a moderator</p>
              <UserPicker id="add-moderator" actionLabel="Make moderator" onSelect={addModerator} excludeIds={(team || []).map((p) => p.user_id)} disabled={Boolean(busy) || archived} />
            </div>
          </section>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={onConfirm}
        destructive={confirm === 'archive'}
        title={confirm === 'archive' ? `Archive “${room.name}”?` : `Lock “${room.name}”?`}
        description={confirm === 'archive'
          ? 'The room becomes read-only: nobody can join or post, and it leaves the public room list. You can restore it later.'
          : 'Only room moderators and staff can post until you unlock it.'}
        reasonLabel={confirm === 'lock' ? 'Reason shown to admins (optional)' : null}
        confirmLabel={confirm === 'archive' ? 'Archive room' : 'Lock room'}
      />
    </>
  );
}

ModeratorManager.propTypes = {
  room: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};
