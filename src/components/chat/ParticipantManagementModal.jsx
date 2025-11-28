import React, { useState, useEffect } from 'react';
import { ChatRoomParticipant, User, Message } from '@/api/entities';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Search,
  Shield,
  Ban,
  UserX,
  Crown,
  MessageSquare,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function ParticipantManagementModal({ open, onClose, room, currentUser }) {
  const [participants, setParticipants] = useState([]);
  const [users, setUsers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, online, moderators, muted, banned

  useEffect(() => {
    if (open) {
      loadParticipants();
    }
  }, [open, room.id]);

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      // Get all participants in this room
      const participants = await ChatRoomParticipant.filter({ 
        chat_room_id: room.id 
      }, '-last_seen_at').catch(() => []);

      // Get user details
      const userIds = [...new Set(participants.map(p => p.user_id))];
      const userData = await Promise.all(
        userIds.map(id => User.filter({ id }).catch(() => []))
      );

      const usersMap = {};
      userData.flat().forEach(u => {
        usersMap[u.id] = u;
      });

      setParticipants(participants);
      setUsers(usersMap);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast.error('Failed to load participants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKick = async (participant) => {
    if (!window.confirm(`Are you sure you want to kick ${users[participant.user_id]?.display_name || 'this user'}?`)) {
      return;
    }

    try {
      // Delete the participant record (removes them from the room)
      await ChatRoomParticipant.delete(participant.id);
      
      // Post a system message
      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was kicked from the room by ${currentUser.display_name}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success('User kicked successfully');
      loadParticipants();
    } catch (error) {
      console.error('Error kicking user:', error);
      toast.error('Failed to kick user');
    }
  };

  const handleMute = async (participant) => {
    const muteDuration = prompt('Mute duration in minutes (default: 60):');
    const minutes = muteDuration ? parseInt(muteDuration) : 60;

    if (isNaN(minutes) || minutes <= 0) {
      toast.error('Invalid duration');
      return;
    }

    try {
      const mutedUntil = new Date();
      mutedUntil.setMinutes(mutedUntil.getMinutes() + minutes);

      await ChatRoomParticipant.update(participant.id, {
        is_muted: true,
        muted_until: mutedUntil.toISOString(),
        muted_by: currentUser.id
      });

      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was muted for ${minutes} minutes by ${currentUser.display_name}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success(`User muted for ${minutes} minutes`);
      loadParticipants();
    } catch (error) {
      console.error('Error muting user:', error);
      toast.error('Failed to mute user');
    }
  };

  const handleUnmute = async (participant) => {
    try {
      await ChatRoomParticipant.update(participant.id, {
        is_muted: false,
        muted_until: null,
        muted_by: null
      });

      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was unmuted by ${currentUser.display_name}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success('User unmuted successfully');
      loadParticipants();
    } catch (error) {
      console.error('Error unmuting user:', error);
      toast.error('Failed to unmute user');
    }
  };

  const handleBan = async (participant) => {
    const reason = prompt('Ban reason:');
    if (!reason) {
      toast.warning('Ban cancelled - reason required');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently ban ${users[participant.user_id]?.display_name || 'this user'}?`)) {
      return;
    }

    try {
      await ChatRoomParticipant.update(participant.id, {
        is_banned: true,
        banned_by: currentUser.id,
        ban_reason: reason
      });

      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was banned by ${currentUser.display_name}. Reason: ${reason}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success('User banned successfully');
      loadParticipants();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnban = async (participant) => {
    try {
      await ChatRoomParticipant.update(participant.id, {
        is_banned: false,
        banned_by: null,
        ban_reason: null
      });

      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was unbanned by ${currentUser.display_name}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success('User unbanned successfully');
      loadParticipants();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handlePromoteModerator = async (participant) => {
    if (!window.confirm(`Promote ${users[participant.user_id]?.display_name || 'this user'} to moderator?`)) {
      return;
    }

    try {
      await ChatRoomParticipant.update(participant.id, {
        role: 'moderator'
      });

      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was promoted to moderator by ${currentUser.display_name}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success('User promoted to moderator');
      loadParticipants();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const handleDemoteModerator = async (participant) => {
    if (!window.confirm(`Demote ${users[participant.user_id]?.display_name || 'this user'} from moderator?`)) {
      return;
    }

    try {
      await ChatRoomParticipant.update(participant.id, {
        role: 'member'
      });

      await Message.create({
        chat_room_id: room.id,
        content: `${users[participant.user_id]?.display_name || 'User'} was demoted from moderator by ${currentUser.display_name}`,
        is_bot: true,
        message_type: 'text'
      });

      toast.success('User demoted from moderator');
      loadParticipants();
    } catch (error) {
      console.error('Error demoting user:', error);
      toast.error('Failed to demote user');
    }
  };

  const filteredParticipants = participants.filter(p => {
    const user = users[p.user_id];
    if (!user) return false;

    // Search filter
    const matchesSearch = (user.display_name || user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Status filter
    if (filter === 'online' && !p.is_online) return false;
    if (filter === 'moderators' && p.role !== 'moderator') return false;
    if (filter === 'muted' && !p.is_muted) return false;
    if (filter === 'banned' && !p.is_banned) return false;

    return true;
  });

  const stats = {
    total: participants.length,
    online: participants.filter(p => p.is_online).length,
    moderators: participants.filter(p => p.role === 'moderator').length,
    muted: participants.filter(p => p.is_muted).length,
    banned: participants.filter(p => p.is_banned).length
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Participants - {room.name}
          </DialogTitle>
          <DialogDescription>
            Kick, mute, ban, or promote participants in this room
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`p-3 rounded-lg border transition-colors ${
              filter === 'all' ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-600">Total</p>
          </button>

          <button
            onClick={() => setFilter('online')}
            className={`p-3 rounded-lg border transition-colors ${
              filter === 'online' ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2 animate-pulse"></div>
            <p className="text-2xl font-bold text-slate-900">{stats.online}</p>
            <p className="text-xs text-slate-600">Online</p>
          </button>

          <button
            onClick={() => setFilter('moderators')}
            className={`p-3 rounded-lg border transition-colors ${
              filter === 'moderators' ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{stats.moderators}</p>
            <p className="text-xs text-slate-600">Moderators</p>
          </button>

          <button
            onClick={() => setFilter('muted')}
            className={`p-3 rounded-lg border transition-colors ${
              filter === 'muted' ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Ban className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{stats.muted}</p>
            <p className="text-xs text-slate-600">Muted</p>
          </button>

          <button
            onClick={() => setFilter('banned')}
            className={`p-3 rounded-lg border transition-colors ${
              filter === 'banned' ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserX className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900">{stats.banned}</p>
            <p className="text-xs text-slate-600">Banned</p>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Participants List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No participants found</p>
            </div>
          ) : (
            filteredParticipants.map(participant => {
              const user = users[participant.user_id];
              if (!user) return null;

              const isCurrentUserTarget = participant.user_id === currentUser.id;
              const isMuted = participant.is_muted && participant.muted_until && new Date(participant.muted_until) > new Date();
              const isBanned = participant.is_banned;

              return (
                <div key={participant.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: user.profile_color || '#3B82F6', color: 'white' }}>
                        {user.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {participant.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{user.display_name || user.email}</p>
                      
                      {participant.role === 'moderator' && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Moderator
                        </Badge>
                      )}
                      
                      {participant.role === 'admin' && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      
                      {isMuted && (
                        <Badge className="bg-orange-100 text-orange-800">
                          <Ban className="w-3 h-3 mr-1" />
                          Muted
                        </Badge>
                      )}
                      
                      {isBanned && (
                        <Badge className="bg-red-100 text-red-800">
                          <UserX className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      {participant.message_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {participant.message_count} messages
                        </span>
                      )}
                      {participant.last_seen_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(participant.last_seen_at), { addSuffix: true })}
                        </span>
                      )}
                      {isMuted && participant.muted_until && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertTriangle className="w-3 h-3" />
                          Until {new Date(participant.muted_until).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isCurrentUserTarget && (
                    <div className="flex items-center gap-1">
                      {!isBanned && (
                        <>
                          {isMuted ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnmute(participant)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Unmute
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMute(participant)}
                              className="text-orange-600 hover:text-orange-800"
                            >
                              Mute
                            </Button>
                          )}

                          {participant.role === 'moderator' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDemoteModerator(participant)}
                            >
                              Demote
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePromoteModerator(participant)}
                            >
                              Promote
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleKick(participant)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Kick
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBan(participant)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Ban
                          </Button>
                        </>
                      )}

                      {isBanned && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnban(participant)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Unban
                        </Button>
                      )}
                    </div>
                  )}

                  {isCurrentUserTarget && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}