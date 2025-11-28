import React, { useState, useEffect } from 'react';
import { ChatRoomParticipant, User } from '@/api/entities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Shield,
  VolumeX,
  Ban,
  UserCheck,
  Clock,
  MessageSquare,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

export default function ParticipantManagementModal({ open, onClose, chatRoom, adminUser }) {
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open && chatRoom) {
      loadParticipants();
    }
  }, [open, chatRoom]);

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const roomParticipants = await ChatRoomParticipant.filter({ 
        chat_room_id: chatRoom.id 
      });

      // Get user details for participants
      const userIds = roomParticipants.map(p => p.user_id);
      const users = userIds.length > 0 ? await User.filter({ id: { '$in': userIds } }) : [];
      const usersMap = new Map(users.map(u => [u.id, u]));

      const enrichedParticipants = roomParticipants.map(p => ({
        ...p,
        user: usersMap.get(p.user_id)
      }));

      setParticipants(enrichedParticipants);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast.error('Failed to load participants');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteToModerator = async (participantId, userId) => {
    try {
      await ChatRoomParticipant.update(participantId, { role: 'moderator' });
      
      await logAuditAction(
        adminUser,
        'PARTICIPANT_PROMOTED',
        'ChatRoomParticipant',
        participantId,
        `Promoted user to moderator in room "${chatRoom.name}"`
      );

      toast.success('User promoted to moderator');
      loadParticipants();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const handleDemoteFromModerator = async (participantId) => {
    try {
      await ChatRoomParticipant.update(participantId, { role: 'member' });
      
      await logAuditAction(
        adminUser,
        'PARTICIPANT_DEMOTED',
        'ChatRoomParticipant',
        participantId,
        `Demoted moderator to member in room "${chatRoom.name}"`
      );

      toast.success('User demoted to member');
      loadParticipants();
    } catch (error) {
      console.error('Error demoting user:', error);
      toast.error('Failed to demote user');
    }
  };

  const handleMuteUser = async (participantId, duration = 24) => {
    try {
      const muteUntil = new Date();
      muteUntil.setHours(muteUntil.getHours() + duration);

      await ChatRoomParticipant.update(participantId, {
        is_muted: true,
        muted_until: muteUntil.toISOString(),
        muted_by: adminUser.id
      });

      await logAuditAction(
        adminUser,
        'PARTICIPANT_MUTED',
        'ChatRoomParticipant',
        participantId,
        `Muted user for ${duration} hours in room "${chatRoom.name}"`
      );

      toast.success(`User muted for ${duration} hours`);
      loadParticipants();
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('Failed to mute user');
    }
  };

  const handleUnmuteUser = async (participantId) => {
    try {
      await ChatRoomParticipant.update(participantId, {
        is_muted: false,
        muted_until: null
      });

      await logAuditAction(
        adminUser,
        'PARTICIPANT_UNMUTED',
        'ChatRoomParticipant',
        participantId,
        `Unmuted user in room "${chatRoom.name}"`
      );

      toast.success('User unmuted');
      loadParticipants();
    } catch (error) {
      console.error('Error unmuting user:', error);
      toast.error('Failed to unmute user');
    }
  };

  const handleBanUser = async (participantId) => {
    if (!window.confirm('Are you sure you want to ban this user from this room?')) {
      return;
    }

    try {
      const reason = window.prompt('Reason for ban (optional):');
      
      await ChatRoomParticipant.update(participantId, {
        is_banned: true,
        banned_by: adminUser.id,
        ban_reason: reason
      });

      await logAuditAction(
        adminUser,
        'PARTICIPANT_BANNED',
        'ChatRoomParticipant',
        participantId,
        `Banned user from room "${chatRoom.name}". Reason: ${reason || 'None provided'}`
      );

      toast.success('User banned from room');
      loadParticipants();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (participantId) => {
    try {
      await ChatRoomParticipant.update(participantId, {
        is_banned: false,
        ban_reason: null
      });

      await logAuditAction(
        adminUser,
        'PARTICIPANT_UNBANNED',
        'ChatRoomParticipant',
        participantId,
        `Unbanned user from room "${chatRoom.name}"`
      );

      toast.success('User unbanned from room');
      loadParticipants();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!window.confirm('Are you sure you want to remove this participant from the room?')) {
      return;
    }

    try {
      await ChatRoomParticipant.delete(participantId);
      
      await logAuditAction(
        adminUser,
        'PARTICIPANT_REMOVED',
        'ChatRoomParticipant',
        participantId,
        `Removed participant from room "${chatRoom.name}"`
      );

      toast.success('Participant removed');
      loadParticipants();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove participant');
    }
  };

  const filteredParticipants = participants.filter(p => {
    if (!searchTerm) return true;
    const user = p.user;
    return (
      user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const roleConfig = {
    admin: { color: 'bg-red-100 text-red-800', label: 'Admin', icon: Shield },
    moderator: { color: 'bg-purple-100 text-purple-800', label: 'Moderator', icon: Shield },
    member: { color: 'bg-blue-100 text-blue-800', label: 'Member', icon: Users }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-600" />
            Participant Management - {chatRoom?.name}
          </DialogTitle>
          <DialogDescription>
            View and manage all participants in this chat room
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600">Total Participants</p>
              <p className="text-xl font-bold text-blue-800">{participants.length}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-purple-600">Moderators</p>
              <p className="text-xl font-bold text-purple-800">
                {participants.filter(p => p.role === 'moderator').length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600">Online Now</p>
              <p className="text-xl font-bold text-green-800">
                {participants.filter(p => p.is_online).length}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-orange-600">Muted/Banned</p>
              <p className="text-xl font-bold text-orange-800">
                {participants.filter(p => p.is_muted || p.is_banned).length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Participants Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-700 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Participant</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Activity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center">
                      Loading participants...
                    </td>
                  </tr>
                ) : filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center">
                      <Users className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">No participants found</p>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map(participant => {
                    const config = roleConfig[participant.role] || roleConfig.member;
                    const RoleIcon = config.icon;

                    return (
                      <tr key={participant.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={participant.user?.profile_image_url || `https://avatar.vercel.sh/${participant.user?.email}.png`}
                                alt={participant.user_name}
                                className="w-10 h-10 rounded-full"
                              />
                              {participant.is_online && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {participant.user?.display_name || participant.user_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {participant.user?.email || participant.user_email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge className={`${config.color} border-0`}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {participant.is_banned && (
                              <Badge className="bg-red-100 text-red-800 border-0">
                                <Ban className="w-3 h-3 mr-1" />
                                Banned
                              </Badge>
                            )}
                            {participant.is_muted && !participant.is_banned && (
                              <Badge className="bg-orange-100 text-orange-800 border-0">
                                <VolumeX className="w-3 h-3 mr-1" />
                                Muted
                              </Badge>
                            )}
                            {!participant.is_muted && !participant.is_banned && participant.is_online && (
                              <Badge className="bg-green-100 text-green-800 border-0">
                                Online
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <MessageSquare className="w-3 h-3" />
                              {participant.message_count || 0} messages
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              Joined {new Date(participant.joined_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {participant.role === 'member' && !participant.is_banned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePromoteToModerator(participant.id, participant.user_id)}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Make Mod
                              </Button>
                            )}

                            {participant.role === 'moderator' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDemoteFromModerator(participant.id)}
                                className="text-slate-600 hover:text-slate-800"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Demote
                              </Button>
                            )}

                            {!participant.is_muted && !participant.is_banned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMuteUser(participant.id, 24)}
                                className="text-orange-600 hover:text-orange-800"
                              >
                                <VolumeX className="w-4 h-4 mr-1" />
                                Mute
                              </Button>
                            )}

                            {participant.is_muted && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnmuteUser(participant.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Unmute
                              </Button>
                            )}

                            {!participant.is_banned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBanUser(participant.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Ban
                              </Button>
                            )}

                            {participant.is_banned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnbanUser(participant.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Unban
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}