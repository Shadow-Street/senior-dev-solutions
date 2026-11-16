import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Edit, Trash2, Users, MessageSquare, Crown, Shield, Eye, Lock, Archive, Radio, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import chatAdminApi from './chatAdminApi';
import { PLANS, ROOM_TYPES, apiError, normalizePlan, planLabel, roomState, roomTypeLabel } from './chatRoomUtils';
import ChatRoomFormModal from './ChatRoomFormModal';
import MessageModerationPanel from './MessageModerationPanel';
import ModeratorManager from './ModeratorManager';
import ParticipantManagementModal from './ParticipantManagementModal';
import ConfirmActionDialog from './ConfirmActionDialog';
import PropTypes from 'prop-types';

const STATE_BADGE = {
  live: { label: 'Live', className: 'bg-buy-muted text-buy-muted-foreground', icon: Radio },
  idle: { label: 'Idle', className: 'bg-surface-2 text-subtle', icon: null },
  locked: { label: 'Locked', className: 'bg-hold-muted text-hold-muted-foreground', icon: Lock },
  archived: { label: 'Archived', className: 'bg-sell-muted text-sell-muted-foreground', icon: Archive },
};

const PLAN_BADGE = {
  free: 'bg-surface-2 text-subtle',
  premium: 'bg-primary text-primary-foreground',
  vip: 'bg-hold text-hold-foreground',
};

export default function ChatRoomTable({ rooms, filteredRooms, filters, onFiltersChange, onChanged, adminUser = null }) {
  const [editing, setEditing] = useState(null);
  const [participantsRoom, setParticipantsRoom] = useState(null);
  const [messagesRoom, setMessagesRoom] = useState(null);
  const [controlsRoom, setControlsRoom] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const setFilter = (key) => (value) => onFiltersChange({ ...filters, [key]: value });

  const saveEdit = async (payload) => {
    try {
      await chatAdminApi.updateRoom(editing.id, payload);
      toast.success('Chat room updated');
      setEditing(null);
      await onChanged();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update chat room'));
      throw e;
    }
  };

  const confirmDelete = async ({ typed }) => {
    try {
      await chatAdminApi.deleteRoom(deleting.id, typed);
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
      await onChanged();
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete chat room'));
    }
  };

  // Keep open dialogs pointing at fresh data after a reload.
  const fresh = (room) => (room ? rooms.find((r) => r.id === room.id) || room : null);

  return (
    <>
      <Card className="shadow-sm border bg-card">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
              <Input
                aria-label="Search rooms"
                placeholder="Search by name, description or stock symbol..."
                value={filters.search}
                onChange={(e) => setFilter('search')(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.type} onValueChange={setFilter('type')}>
              <SelectTrigger className="w-full lg:w-44" aria-label="Filter by room type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ROOM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.plan} onValueChange={setFilter('plan')}>
              <SelectTrigger className="w-full lg:w-36" aria-label="Filter by plan"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={setFilter('status')}>
              <SelectTrigger className="w-full lg:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Not archived</SelectItem>
                <SelectItem value="live">Live now</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            Showing {filteredRooms.length} of {rooms.length} rooms
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-subtle uppercase bg-surface-2">
                <tr>
                  <th scope="col" className="px-4 py-3">Room details</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3">Participants</th>
                  <th scope="col" className="px-4 py-3">Messages</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const state = STATE_BADGE[roomState(room)];
                  const plan = normalizePlan(room.required_plan);
                  return (
                    <tr key={room.id} className="border-b hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{room.name}</span>
                            {room.is_public === false && <EyeOff className="w-3 h-3 text-subtle" aria-label="Private room" />}
                          </div>
                          {room.description && <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>}
                          {room.stock_symbol && <Badge variant="outline" className="text-xs">{room.stock_symbol}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {['premium', 'premium_admin'].includes(room.room_type) ? <Crown className="w-3 h-3" aria-hidden="true" /> : room.room_type === 'admin' ? <Shield className="w-3 h-3" aria-hidden="true" /> : <MessageSquare className="w-3 h-3" aria-hidden="true" />}
                          {roomTypeLabel(room.room_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-subtle space-y-1">
                          <div className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden="true" />{room.participant_count}</div>
                          {room.online_count > 0 && <div className="text-buy-muted-foreground">{room.online_count} online</div>}
                          {room.ban_count > 0 && <div className="text-sell-muted-foreground">{room.ban_count} banned</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-subtle">
                          <MessageSquare className="w-3 h-3" aria-hidden="true" />{room.message_count}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge className={`${state.className} text-xs w-fit flex items-center gap-1`}>
                            {state.icon && <state.icon className="w-3 h-3" aria-hidden="true" />}{state.label}
                          </Badge>
                          <Badge className={`${PLAN_BADGE[plan] || PLAN_BADGE.free} text-xs w-fit`}>{planLabel(plan)}</Badge>
                          {room.admin_only_post && <span className="text-[11px] text-subtle">Moderators post only</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setParticipantsRoom(room)}>
                            <Users className="w-4 h-4 mr-1" aria-hidden="true" />Participants
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setMessagesRoom(room)} aria-label={`View messages in ${room.name}`} title="View and moderate messages">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setControlsRoom(room)} aria-label={`Moderation and access for ${room.name}`} title="Moderation and access controls">
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(room)} className="text-primary" aria-label={`Edit ${room.name}`} title="Edit room">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(room)} className="text-sell-muted-foreground" aria-label={`Delete ${room.name}`} title="Delete room permanently">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRooms.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No chat rooms found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rooms.length === 0 ? 'No chat rooms have been created yet.' : 'Try adjusting your search or filters.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ChatRoomFormModal open={Boolean(editing)} room={editing} onClose={() => setEditing(null)} onSave={saveEdit} user={adminUser} />
      <ParticipantManagementModal room={fresh(participantsRoom)} onClose={() => setParticipantsRoom(null)} onChanged={onChanged} />
      <MessageModerationPanel room={fresh(messagesRoom)} onClose={() => setMessagesRoom(null)} onChanged={onChanged} />
      <ModeratorManager room={fresh(controlsRoom)} onClose={() => setControlsRoom(null)} onChanged={onChanged} />
      <ConfirmActionDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        destructive
        title="Delete chat room permanently?"
        description={deleting ? `"${deleting.name}" and all of its ${deleting.message_count} messages, participants, invites, rules and schedules will be removed. This cannot be undone. To keep the history, archive the room instead (shield button).` : ''}
        requireText={deleting?.name ?? ''}
        confirmLabel="Delete room"
      />
    </>
  );
}

ChatRoomTable.propTypes = {
  rooms: PropTypes.array.isRequired,
  filteredRooms: PropTypes.array.isRequired,
  filters: PropTypes.object.isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  onChanged: PropTypes.func.isRequired,
  adminUser: PropTypes.object,
};
