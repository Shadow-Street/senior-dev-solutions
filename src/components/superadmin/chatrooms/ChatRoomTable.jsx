
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Edit,
  Trash2,
  Users,
  MessageSquare,
  Video,
  Crown,
  Shield,
  Eye,
  Lock
} from 'lucide-react';
import ChatRoomFormModal from './ChatRoomFormModal';
import MessageModerationPanel from './MessageModerationPanel';
import ModeratorManager from './ModeratorManager';
import ParticipantManagementModal from './ParticipantManagementModal'; // New import

// IMPORTANT: The `User` object for `User.me()` in the useEffect hook is assumed to be
// either globally available or imported from an API service/context.
// For the purpose of making this file syntactically valid and runnable,
// a mock `User.me()` implementation is provided here. In a real application,
// this mock should be replaced with the actual User service import and call.
const User = {
  me: async () => {
    // Simulate fetching the current admin user.
    // Replace with an actual API call (e.g., from an auth service).
    return { id: 'mock-admin-user-id', username: 'DashboardAdmin', app_role: 'super_admin' };
  }
};

export default function ChatRoomTable({ chatRooms, messages, users, onUpdate, onDelete, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // State for editing a chat room (replaces original selectedRoom for edit)
  const [editingRoom, setEditingRoom] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // States for message moderation and moderator management
  const [selectedRoomForMessages, setSelectedRoomForMessages] = useState(null);
  const [selectedRoomForModerators, setSelectedRoomForModerators] = useState(null);

  // New states for participant management modal
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null); // This 'selectedRoom' is specifically for ParticipantManagementModal
  const [currentAdmin, setCurrentAdmin] = useState(null);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const admin = await User.me().catch(() => null);
        setCurrentAdmin(admin);
      } catch (error) {
        console.error('Error loading current admin user:', error);
        setCurrentAdmin(null);
      }
    };
    loadAdmin();
  }, []);

  const filteredRooms = useMemo(() => {
    return chatRooms.filter(room => {
      const matchesSearch = searchTerm === '' ||
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.stock_symbol?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || room.room_type === typeFilter;
      const matchesPlan = planFilter === 'all' || room.required_plan === planFilter;
      
      const isActive = room.is_meeting_active || (room.participant_count && room.participant_count > 0);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesType && matchesPlan && matchesStatus;
    });
  }, [chatRooms, searchTerm, typeFilter, planFilter, statusFilter]);

  const handleEdit = (room) => {
    setEditingRoom(room); // Changed from setSelectedRoom to setEditingRoom
    setShowEditModal(true);
  };

  const handleSave = async (roomData) => {
    try {
      if (editingRoom) { // Changed from selectedRoom
        await onUpdate(editingRoom.id, roomData); // Changed from selectedRoom.id
        setShowEditModal(false);
        setEditingRoom(null); // Changed from setSelectedRoom(null)
      }
    } catch (error) {
      console.error('Error updating room:', error);
    }
  };

  const handleOpenParticipants = (room) => {
    setSelectedRoom(room); // Uses the new selectedRoom state for participants
    setShowParticipantsModal(true);
  };

  const getRoomTypeIcon = (roomType) => {
    switch (roomType) {
      case 'premium': return <Crown className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'premium_admin': return <Shield className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getRoomTypeColor = (roomType) => {
    switch (roomType) {
      case 'premium': return 'bg-premium-muted text-protocall-premium-text';
      case 'admin': return 'bg-premium-muted text-primary';
      case 'premium_admin': return 'bg-premium-muted text-primary';
      case 'stock_specific': return 'bg-buy-muted text-buy-muted-foreground';
      case 'sector': return 'bg-premium-muted text-primary';
      default: return 'bg-surface-2 text-foreground';
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'vip': return 'bg-hold text-hold-foreground';
      case 'premium': return 'bg-gradient-to-r from-protocall-deep to-protocall-blue text-white';
      case 'basic': return 'bg-border text-subtle';
      default: return 'bg-surface-2 text-subtle';
    }
  };

  // Get admin user for passing to ChatRoomFormModal (from users prop)
  const adminUser = users.find(u => u.app_role === 'admin' || u.app_role === 'super_admin') || users[0];

  return (
    <>
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search rooms by name, description, or stock symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="stock_specific">Stock Specific</SelectItem>
                <SelectItem value="sector">Sector</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="premium_admin">Premium Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-subtle uppercase bg-surface-2">
                <tr>
                  <th className="px-6 py-3 text-left">Room Details</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Participants</th>
                  <th className="px-6 py-3 text-left">Messages</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map(room => {
                  const roomMessages = messages.filter(m => m.chat_room_id === room.id);
                  const isActive = room.is_meeting_active || (room.participant_count && room.participant_count > 0);

                  return (
                    <tr key={room.id} className="bg-white border-b hover:bg-surface-2 transition-colors">
                      {/* Room Details Column */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{room.name}</span>
                            {room.is_premium && (
                              <Lock className="w-3 h-3 text-protocall-premium-text" />
                            )}
                          </div>
                          {room.description && (
                            <p className="text-xs text-muted-foreground">{room.description}</p>
                          )}
                          {room.stock_symbol && (
                            <Badge variant="outline" className="text-xs">
                              {room.stock_symbol}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="px-6 py-4">
                        <Badge className={`${getRoomTypeColor(room.room_type)} flex items-center gap-1 w-fit`}>
                          {getRoomTypeIcon(room.room_type)}
                          {room.room_type?.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Participants Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-subtle text-xs">
                          <Users className="w-3 h-3" />
                          <span>{room.participant_count || 0}</span>
                        </div>
                      </td>

                      {/* Messages Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-subtle text-xs">
                          <MessageSquare className="w-3 h-3" />
                          <span>{roomMessages.length}</span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 space-y-1">
                        {isActive && (
                          <Badge className="bg-buy-muted text-buy-muted-foreground text-xs">
                            Live
                          </Badge>
                        )}
                        {room.is_meeting_active && (
                          <Badge className="bg-premium-muted text-primary text-xs flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Meeting
                          </Badge>
                        )}
                        {room.required_plan && (
                            <Badge className={`${getPlanBadgeColor(room.required_plan)} text-xs`}>
                              {room.required_plan.toUpperCase()}
                            </Badge>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenParticipants(room)}
                            title="Manage Participants"
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Participants
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoomForMessages(room)}
                            title="View Messages"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoomForModerators(room)}
                            title="Manage Moderators"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(room)}
                            className="text-primary hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(room.id)}
                            className="text-sell-muted-foreground hover:text-sell-muted-foreground"
                          >
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
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No chat rooms found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {chatRooms.length === 0
                    ? "No chat rooms have been created yet."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Room Modal */}
      <ChatRoomFormModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRoom(null); // Updated state
        }}
        room={editingRoom} // Updated prop
        onSave={handleSave}
        user={adminUser}
      />

      {/* New Participant Management Modal */}
      <ParticipantManagementModal
        open={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        chatRoom={selectedRoom} // Uses the new selectedRoom state for participants
        adminUser={currentAdmin} // Uses the currentAdmin from useEffect
      />

      {/* Messages Panel */}
      <MessageModerationPanel
        room={selectedRoomForMessages}
        messages={messages.filter(m => m.chat_room_id === selectedRoomForMessages?.id)}
        users={users}
        onClose={() => setSelectedRoomForMessages(null)}
        onRefresh={onRefresh}
      />

      {/* Moderators Panel */}
      <ModeratorManager
        room={selectedRoomForModerators}
        users={users}
        onClose={() => setSelectedRoomForModerators(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}
