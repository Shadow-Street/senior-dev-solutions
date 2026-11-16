import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Copy, Ban, Trash2, Loader2, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { apiError, formatDateTime, inviteLink } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import PropTypes from 'prop-types';

const STATUS_BADGE = {
  active: 'bg-buy-muted text-buy-muted-foreground',
  revoked: 'bg-sell-muted text-sell-muted-foreground',
  expired: 'bg-surface-2 text-subtle',
  exhausted: 'bg-hold-muted text-hold-muted-foreground',
};

/**
 * Invite links: /ChatRooms?invite=CODE. Following one (signed in) adds the
 * person to the room with the invite's role. Revoking stops it at once.
 * Invites do not bypass room bans, archived rooms or paid plans.
 */
export default function InviteSystemPanel({ rooms }) {
  const [invites, setInvites] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ chat_room_id: '', max_uses: '25', expires_in_hours: '72', role_to_assign: 'member' });
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind, invite }
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setError(null);
      setInvites(await chatAdminApi.invites());
    } catch (e) {
      setError(apiError(e, 'Could not load invites'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const activeRooms = rooms.filter((r) => r.status !== 'archived');
  const shown = useMemo(() => (invites || []).filter((i) => statusFilter === 'all' || i.status === statusFilter), [invites, statusFilter]);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!form.chat_room_id) { toast.error('Choose a room'); return; }
    setCreating(true);
    try {
      const invite = await chatAdminApi.createInvite({
        chat_room_id: form.chat_room_id,
        max_uses: Number(form.max_uses),
        expires_in_hours: Number(form.expires_in_hours),
        role_to_assign: form.role_to_assign,
      });
      toast.success('Invite link created');
      await load();
      copy(invite.code);
    } catch (err) {
      toast.error(apiError(err, 'Failed to create the invite'));
    } finally {
      setCreating(false);
    }
  };

  const onConfirm = async () => {
    const { kind, invite } = confirm;
    try {
      if (kind === 'revoke') await chatAdminApi.revokeInvite(invite.id);
      else await chatAdminApi.deleteInvite(invite.id);
      toast.success(kind === 'revoke' ? 'Invite revoked' : 'Invite deleted');
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(apiError(e, 'Action failed'));
    }
  };

  const count = (s) => (invites ? invites.filter((i) => i.status === s).length : '—');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Active', count('active')], ['Used up', count('exhausted')], ['Expired', count('expired')], ['Revoked', count('revoked')]].map(([label, value]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-subtle">{label}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" aria-hidden="true" />Create an invite link</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="inv-room">Room</Label>
              <Select value={form.chat_room_id} onValueChange={(v) => setForm({ ...form, chat_room_id: v })}>
                <SelectTrigger id="inv-room" className="mt-1"><SelectValue placeholder="Choose a room" /></SelectTrigger>
                <SelectContent>{activeRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}{r.is_public === false ? ' (invite only)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inv-uses">Max uses</Label>
              <Input id="inv-uses" type="number" min={1} max={10000} className="mt-1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="inv-expiry">Expires after</Label>
              <Select value={form.expires_in_hours} onValueChange={(v) => setForm({ ...form, expires_in_hours: v })}>
                <SelectTrigger id="inv-expiry" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['1', '1 hour'], ['24', '1 day'], ['72', '3 days'], ['168', '7 days'], ['720', '30 days']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inv-role">Joins as</Label>
              <Select value={form.role_to_assign} onValueChange={(v) => setForm({ ...form, role_to_assign: v })}>
                <SelectTrigger id="inv-role" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="moderator">Moderator</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <Button type="submit" disabled={creating || !activeRooms.length}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Link2 className="w-4 h-4 mr-2" aria-hidden="true" />}Create and copy link
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Invite links</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" aria-label="Filter invites by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="exhausted">Used up</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-sell-muted-foreground flex items-center gap-2" role="alert"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error}<Button size="sm" variant="outline" onClick={load}>Retry</Button></p>}
          {!invites && !error && <p className="text-sm text-subtle" role="status"><Loader2 className="w-4 h-4 inline animate-spin mr-1" aria-hidden="true" />Loading…</p>}
          {invites && shown.length === 0 && <p className="text-sm text-subtle text-center py-8">{invites.length ? 'No invites with this status.' : 'No invite links yet.'}</p>}
          {shown.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left">Link</th>
                    <th scope="col" className="px-4 py-2 text-left">Room</th>
                    <th scope="col" className="px-4 py-2 text-left">Uses</th>
                    <th scope="col" className="px-4 py-2 text-left">Expires</th>
                    <th scope="col" className="px-4 py-2 text-left">Status</th>
                    <th scope="col" className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="px-4 py-2">
                        <code className="text-xs break-all">{inviteLink(i.code)}</code>
                        {i.role_to_assign === 'moderator' && <Badge variant="outline" className="ml-2 text-xs">Moderator</Badge>}
                      </td>
                      <td className="px-4 py-2">{i.room?.name}</td>
                      <td className="px-4 py-2">{i.uses_count || 0} / {i.max_uses}</td>
                      <td className="px-4 py-2 text-xs">{formatDateTime(i.expires_at)}</td>
                      <td className="px-4 py-2"><Badge className={STATUS_BADGE[i.status]}>{i.status === 'exhausted' ? 'used up' : i.status}</Badge></td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {i.status === 'active' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => copy(i.code)} aria-label="Copy invite link"><Copy className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: 'revoke', invite: i })} aria-label="Revoke invite"><Ban className="w-4 h-4" /></Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-sell-muted-foreground" onClick={() => setConfirm({ kind: 'delete', invite: i })} aria-label="Delete invite"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={onConfirm}
        destructive
        title={confirm?.kind === 'revoke' ? 'Revoke this invite link?' : 'Delete this invite link?'}
        description={confirm?.kind === 'revoke'
          ? 'The link stops working immediately. People who already joined stay in the room.'
          : 'The link and its usage record are removed. People who already joined stay in the room.'}
        confirmLabel={confirm?.kind === 'revoke' ? 'Revoke' : 'Delete'}
      />
    </div>
  );
}

InviteSystemPanel.propTypes = {
  rooms: PropTypes.array.isRequired,
};
