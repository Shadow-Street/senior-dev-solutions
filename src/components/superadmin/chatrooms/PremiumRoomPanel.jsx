import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Star, Users, Loader2, AlertTriangle, Gift } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { PLANS, apiError, formatDateTime, normalizePlan, planLabel } from './chatRoomUtils';
import ConfirmActionDialog from './ConfirmActionDialog';
import UserPicker from './UserPicker';
import PropTypes from 'prop-types';

/**
 * Premium & VIP rooms: the plan each paid room requires (enforced on join,
 * read and post), its room subscriptions, and admin-granted access.
 * Replaces the old Premium and VIP tabs, which edited fields nothing read.
 */
export default function PremiumRoomPanel({ rooms, onChanged }) {
  const paidRooms = useMemo(() => rooms.filter((r) => normalizePlan(r.required_plan) !== 'free' || r.is_premium), [rooms]);
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [days, setDays] = useState('30');
  const [busy, setBusy] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const loadSubs = useCallback(async () => {
    try {
      setError(null);
      setSubs(await chatAdminApi.roomSubscriptions());
    } catch (e) {
      setError(apiError(e, 'Could not load room subscriptions'));
    }
  }, []);
  useEffect(() => { loadSubs(); }, [loadSubs]);
  useEffect(() => {
    if (!selectedId && paidRooms[0]) setSelectedId(paidRooms[0].id);
  }, [paidRooms, selectedId]);

  const liveByRoom = useMemo(() => {
    const map = new Map();
    for (const s of subs || []) if (s.is_live) map.set(s.room_id, (map.get(s.room_id) || 0) + 1);
    return map;
  }, [subs]);

  const setPlan = async (room, plan) => {
    setBusy(room.id);
    try {
      await chatAdminApi.updateRoom(room.id, { required_plan: plan });
      toast.success(`"${room.name}" now requires ${planLabel(plan)}`);
      await onChanged();
    } catch (e) {
      toast.error(apiError(e, 'Failed to change the plan'));
    } finally {
      setBusy(null);
    }
  };

  const grant = async (user) => {
    const n = Number.parseInt(days, 10);
    if (!selectedId) { toast.error('Choose a room first'); return; }
    if (!Number.isFinite(n) || n < 1 || n > 365) { toast.error('Access length must be 1–365 days'); return; }
    setBusy('grant');
    try {
      await chatAdminApi.grantAccess(selectedId, user.id, n);
      toast.success(`${user.name} has ${n} day(s) of access`);
      await loadSubs();
    } catch (e) {
      toast.error(apiError(e, 'Failed to grant access'));
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    try {
      await chatAdminApi.revokeSubscription(revoking.id);
      toast.success('Room access revoked');
      setRevoking(null);
      await loadSubs();
    } catch (e) {
      toast.error(apiError(e, 'Failed to revoke access'));
    }
  };

  const roomName = (id) => rooms.find((r) => r.id === id)?.name || 'Deleted room';
  const selectedSubs = (subs || []).filter((s) => s.room_id === selectedId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['Premium rooms', paidRooms.filter((r) => normalizePlan(r.required_plan) === 'premium').length, Crown],
          ['VIP rooms', paidRooms.filter((r) => normalizePlan(r.required_plan) === 'vip').length, Star],
          ['Active room subscriptions', subs ? subs.filter((s) => s.is_live).length : '—', Users],
        ].map(([label, value, Icon]) => (
          <Card key={label}><CardContent className="p-4 flex items-center gap-3">
            <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
            <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-subtle">{label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Plan gating</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Premium: Premium or VIP plan, or a room subscription. VIP: VIP plan or a room subscription. Members who lose access are disconnected; room moderators keep theirs.
          </p>
          {paidRooms.length === 0 ? (
            <p className="text-sm text-subtle py-6 text-center">No paid rooms yet. Set a room&apos;s plan to Premium or VIP from its edit dialog or the Access tab.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-subtle">
                  <tr><th scope="col" className="px-4 py-2 text-left">Room</th><th scope="col" className="px-4 py-2 text-left">Participants</th><th scope="col" className="px-4 py-2 text-left">Active room subs</th><th scope="col" className="px-4 py-2 text-left">Required plan</th></tr>
                </thead>
                <tbody>
                  {paidRooms.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-4 py-2 font-medium">{r.name}{r.status === 'archived' && <Badge variant="outline" className="ml-2 text-xs">Archived</Badge>}</td>
                      <td className="px-4 py-2">{r.participant_count}</td>
                      <td className="px-4 py-2">{subs ? liveByRoom.get(r.id) || 0 : '—'}</td>
                      <td className="px-4 py-2">
                        <Select value={normalizePlan(r.required_plan)} disabled={busy === r.id} onValueChange={(v) => setPlan(r, v)}>
                          <SelectTrigger className="w-32 h-8" aria-label={`Plan for ${r.name}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{PLANS.map((p) => <SelectItem key={p.value} value={p.value} disabled={['premium', 'premium_admin'].includes(r.room_type) && p.value === 'free'}>{p.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {paidRooms.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4" aria-hidden="true" />Room subscriptions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="sub-room">Room</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger id="sub-room" className="mt-1"><SelectValue placeholder="Choose a room" /></SelectTrigger>
                  <SelectContent>{paidRooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sub-days">Complimentary access (days)</Label>
                <Input id="sub-days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Grant access to</p>
              <UserPicker id="grant-access" actionLabel="Grant access" onSelect={grant} disabled={busy === 'grant' || !selectedId} />
            </div>

            {error && <p className="text-sm text-sell-muted-foreground flex items-center gap-2" role="alert"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error} <Button size="sm" variant="outline" onClick={loadSubs}>Retry</Button></p>}
            {!subs && !error && <p className="text-sm text-subtle" role="status"><Loader2 className="w-4 h-4 inline animate-spin mr-1" aria-hidden="true" />Loading…</p>}
            {subs && (
              selectedSubs.length === 0 ? <p className="text-sm text-subtle text-center py-4">No subscriptions for {roomName(selectedId)}.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-xs uppercase text-subtle">
                      <tr><th scope="col" className="px-4 py-2 text-left">Subscriber</th><th scope="col" className="px-4 py-2 text-left">Status</th><th scope="col" className="px-4 py-2 text-left">Source</th><th scope="col" className="px-4 py-2 text-left">Expires</th><th scope="col" className="px-4 py-2 text-right">Action</th></tr>
                    </thead>
                    <tbody>
                      {selectedSubs.map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="px-4 py-2"><p className="font-medium">{s.user?.name}</p><p className="text-xs text-muted-foreground">{s.user?.email}</p></td>
                          <td className="px-4 py-2"><Badge className={s.is_live ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-subtle'}>{s.is_live ? 'Active' : s.status === 'active' ? 'Expired' : s.status}</Badge></td>
                          <td className="px-4 py-2 text-xs">{String(s.payment_reference || '').startsWith('admin_grant') ? 'Granted by admin' : Number(s.amount_paid) > 0 ? `Paid ₹${Number(s.amount_paid).toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-2 text-xs">{formatDateTime(s.expires_at)}</td>
                          <td className="px-4 py-2 text-right">{s.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => setRevoking(s)}>Revoke</Button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmActionDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        destructive
        title="Revoke room access?"
        description={revoking ? `${revoking.user?.name} loses access to ${roomName(revoking.room_id)} now (unless their plan covers it). Payments are not refunded from here.` : ''}
        confirmLabel="Revoke"
      />
    </div>
  );
}

PremiumRoomPanel.propTypes = {
  rooms: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
};
