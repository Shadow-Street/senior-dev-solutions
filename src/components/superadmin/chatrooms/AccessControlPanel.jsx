import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { PLANS, apiError, normalizePlan } from './chatRoomUtils';
import PropTypes from 'prop-types';

/**
 * Who can join, read and post, per room. Every control maps to a rule the
 * server enforces on join, history reads, REST posts and WebSocket posts:
 *   Visibility   public, or invite only (invite links / admin adds people)
 *   Plan         Free / Premium / VIP
 *   Posting      everyone, or moderators only
 *   Locked       temporarily moderators only (with the room's lock reason)
 * Bans and mutes for individuals are in each room's Participants dialog.
 */
export default function AccessControlPanel({ rooms, onChanged }) {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => !q || `${r.name} ${r.stock_symbol || ''}`.toLowerCase().includes(q));
  }, [rooms, search]);

  const apply = async (room, key, fn, message) => {
    setBusy(`${room.id}:${key}`);
    try {
      await fn();
      toast.success(message);
      await onChanged();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update access'));
    } finally {
      setBusy(null);
    }
  };

  const counts = {
    privateRooms: rooms.filter((r) => r.is_public === false).length,
    gated: rooms.filter((r) => normalizePlan(r.required_plan) !== 'free').length,
    modsOnly: rooms.filter((r) => r.admin_only_post).length,
    locked: rooms.filter((r) => r.locked).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Invite-only rooms', counts.privateRooms], ['Plan-gated rooms', counts.gated], ['Moderator-only posting', counts.modsOnly], ['Locked rooms', counts.locked]].map(([label, value]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-subtle">{label}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-base">Room access permissions</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
            <Input aria-label="Search rooms" placeholder="Search rooms…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <p className="text-sm text-subtle text-center py-8">{rooms.length ? 'No rooms match.' : 'No chat rooms yet.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left">Room</th>
                    <th scope="col" className="px-4 py-2 text-left">Public</th>
                    <th scope="col" className="px-4 py-2 text-left">Plan to join</th>
                    <th scope="col" className="px-4 py-2 text-left">Moderators-only posting</th>
                    <th scope="col" className="px-4 py-2 text-left">Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const archived = r.status && r.status !== 'active';
                    const isBusy = (key) => busy === `${r.id}:${key}`;
                    return (
                      <tr key={r.id} className="border-b">
                        <td className="px-4 py-2">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.participant_count} participants{r.ban_count ? ` · ${r.ban_count} banned` : ''}</p>
                          {archived && <Badge variant="outline" className="text-xs mt-1">Archived (read-only)</Badge>}
                        </td>
                        <td className="px-4 py-2">
                          <Switch
                            aria-label={`${r.name} is public`} checked={r.is_public !== false} disabled={Boolean(busy)}
                            onCheckedChange={(v) => apply(r, 'public', () => chatAdminApi.updateRoom(r.id, { is_public: v }), v ? `${r.name} is public` : `${r.name} is invite only`)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={normalizePlan(r.required_plan)} disabled={Boolean(busy)}
                            onValueChange={(v) => apply(r, 'plan', () => chatAdminApi.updateRoom(r.id, { required_plan: v }), `${r.name} plan updated`)}
                          >
                            <SelectTrigger className="w-28 h-8" aria-label={`Plan for ${r.name}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{PLANS.map((p) => <SelectItem key={p.value} value={p.value} disabled={['premium', 'premium_admin'].includes(r.room_type) && p.value === 'free'}>{p.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Switch
                            aria-label={`Only moderators post in ${r.name}`} checked={r.admin_only_post === true} disabled={Boolean(busy)}
                            onCheckedChange={(v) => apply(r, 'posting', () => chatAdminApi.updateRoom(r.id, { admin_only_post: v }), v ? 'Posting limited to moderators' : 'Everyone can post')}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              aria-label={`${r.name} is locked`} checked={r.locked === true} disabled={Boolean(busy) || archived}
                              onCheckedChange={(v) => apply(r, 'lock', () => (v ? chatAdminApi.lockRoom(r.id) : chatAdminApi.unlockRoom(r.id)), v ? `${r.name} locked` : `${r.name} unlocked`)}
                            />
                            {Object.keys({ public: 1, plan: 1, posting: 1, lock: 1 }).some(isBusy) && <Loader2 className="w-4 h-4 animate-spin" aria-label="Saving" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

AccessControlPanel.propTypes = {
  rooms: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
};
