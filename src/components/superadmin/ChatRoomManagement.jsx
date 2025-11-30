
import React, { useState, useEffect, useRef } from 'react';
import { ChatRoom, Message, User } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Plus,
  BarChart3,
  Users as UsersIcon,
  Activity,
  Download,
  RefreshCw,
  Clock,
  Shield,
  Link2,
  Settings,
  Crown, // New import
  Star // New import
} from 'lucide-react';
import { toast } from 'sonner';
import { logAuditAction, AuditActions } from '@/components/utils/auditLogger';

import ChatRoomTable from './chatrooms/ChatRoomTable';
import ChatRoomStats from './chatrooms/ChatRoomStats';
import ChatRoomFormModal from './chatrooms/ChatRoomFormModal';
import RealTimeActivityMonitor from './chatrooms/RealTimeActivityMonitor';
import BulkOperationsPanel from './chatrooms/BulkOperationsPanel';
import RoomAutomationPanel from './chatrooms/RoomAutomationPanel';
import ModerationRulesPanel from './chatrooms/ModerationRulesPanel';
import InviteSystemPanel from './chatrooms/InviteSystemPanel';
import PremiumRoomPanel from './chatrooms/PremiumRoomPanel'; // New import
import VIPFeaturesPanel from './chatrooms/VIPFeaturesPanel'; // New import
import AccessControlPanel from './chatrooms/AccessControlPanel'; // New import

export default function ChatRoomManagement({ user }) {
  const [chatRooms, setChatRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    premium: 0,
    totalParticipants: 0,
    totalMessages: 0,
    activeToday: 0
  });

  const isMounted = useRef(true);
  const hasLoadedOnce = useRef(false);

  const loadData = async () => {
    try {
      if (!isMounted.current) return;
      
      const [rooms, msgs, allUsers] = await Promise.all([
        ChatRoom.list('-created_date'),
        Message.list('-created_date', 1000),
        User.list()
      ]);

      if (!isMounted.current) return;

      setChatRooms(rooms);
      setMessages(msgs);
      setUsers(allUsers);

      const today = new Date().toDateString();
      const activeToday = rooms.filter(r => 
        r.updated_date && new Date(r.updated_date).toDateString() === today
      ).length;

      setStats({
        total: rooms.length,
        active: rooms.filter(r => r.is_meeting_active).length,
        premium: rooms.filter(r => r.is_premium).length,
        totalParticipants: rooms.reduce((sum, r) => sum + (r.participant_count || 0), 0),
        totalMessages: msgs.length,
        activeToday
      });
    } catch (error) {
      if (isMounted.current) {
        console.error('Error loading chat room data:', error);
        toast.error('Failed to load chat room data');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => {
      if (isMounted.current) {
        setIsRefreshing(false);
        toast.success('Data refreshed successfully');
      }
    }, 500);
  };

  const handleCreateRoom = async (roomData) => {
    try {
      const newRoom = await ChatRoom.create(roomData);
      
      await logAuditAction(
        user,
        AuditActions.CHATROOM_CREATED,
        'ChatRoom',
        newRoom.id,
        `Created ${roomData.room_type} chat room "${roomData.name}"${roomData.stock_symbol ? ` for stock ${roomData.stock_symbol}` : ''}`
      );

      toast.success('Chat room created successfully');
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast.error('Failed to create chat room');
    }
  };

  const handleUpdateRoom = async (roomId, roomData) => {
    try {
      await ChatRoom.update(roomId, roomData);
      
      await logAuditAction(
        user,
        AuditActions.CHATROOM_UPDATED,
        'ChatRoom',
        roomId,
        `Updated chat room "${roomData.name}"`
      );

      toast.success('Chat room updated successfully');
      await loadData();
    } catch (error) {
      console.error('Error updating chat room:', error);
      toast.error('Failed to update chat room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this chat room? This action cannot be undone.')) {
      return;
    }

    try {
      const roomToDelete = chatRooms.find(r => r.id === roomId);
      await ChatRoom.delete(roomId);
      
      await logAuditAction(
        user,
        AuditActions.CHATROOM_DELETED,
        'ChatRoom',
        roomId,
        `Deleted chat room "${roomToDelete?.name || 'Unknown'}"`
      );

      toast.success('Chat room deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting chat room:', error);
      toast.error('Failed to delete chat room');
    }
  };

  const exportData = () => {
    const csvData = chatRooms.map(room => ({
      'Room Name': room.name,
      'Description': room.description || '',
      'Room Type': room.room_type,
      'Is Premium': room.is_premium ? 'Yes' : 'No',
      'Required Plan': room.required_plan || 'None',
      'Participants': room.participant_count || 0,
      'Stock Symbol': room.stock_symbol || '',
      'Created Date': new Date(room.created_date).toLocaleDateString(),
      'Active Meeting': room.is_meeting_active ? 'Yes' : 'No'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvString = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatrooms-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    isMounted.current = true;
    
    if (!hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      loadData();
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Chat Room Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chat Room Management</h2>
          <p className="text-slate-600">Manage all chat rooms, participants, and messages</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={isRefreshing}
            className="bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm opacity-90">Total Rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm opacity-90">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-violet-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white p-2">
                <MessageSquare className="w-4 h-4" />
              </Badge>
              <div>
                <p className="text-2xl font-bold">{stats.premium}</p>
                <p className="text-sm opacity-90">Premium Rooms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                <p className="text-sm opacity-90">Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
                <p className="text-sm opacity-90">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">{stats.activeToday}</p>
                <p className="text-sm opacity-90">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList className="grid grid-cols-10 bg-transparent rounded-lg p-1 gap-2">
          <TabsTrigger value="rooms" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <MessageSquare className="w-4 h-4 mr-1" />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="premium" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs">
            <Crown className="w-4 h-4 mr-1" />
            Premium
          </TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white text-xs">
            <Shield className="w-4 h-4 mr-1" />
            Access
          </TabsTrigger>
          <TabsTrigger value="vip" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white text-xs">
            <Star className="w-4 h-4 mr-1" />
            VIP
          </TabsTrigger>
          <TabsTrigger value="bulk" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <Settings className="w-4 h-4 mr-1" />
            Bulk
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <Activity className="w-4 h-4 mr-1" />
            Live
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <BarChart3 className="w-4 h-4 mr-1" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="automation" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <Clock className="w-4 h-4 mr-1" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="moderation" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <Shield className="w-4 h-4 mr-1" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs">
            <Link2 className="w-4 h-4 mr-1" />
            Invites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <ChatRoomTable
            chatRooms={chatRooms}
            messages={messages}
            users={users}
            onUpdate={handleUpdateRoom}
            onDelete={handleDeleteRoom}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="premium">
          <PremiumRoomPanel adminUser={user} />
        </TabsContent>

        <TabsContent value="access">
          <AccessControlPanel />
        </TabsContent>

        <TabsContent value="vip">
          <VIPFeaturesPanel />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkOperationsPanel
            chatRooms={chatRooms}
            onRefresh={loadData}
            adminUser={user}
          />
        </TabsContent>

        <TabsContent value="activity">
          <RealTimeActivityMonitor />
        </TabsContent>

        <TabsContent value="analytics">
          <ChatRoomStats
            chatRooms={chatRooms}
            messages={messages}
            users={users}
          />
        </TabsContent>

        <TabsContent value="automation">
          <RoomAutomationPanel adminUser={user} />
        </TabsContent>

        <TabsContent value="moderation">
          <ModerationRulesPanel />
        </TabsContent>

        <TabsContent value="invites">
          <InviteSystemPanel adminUser={user} />
        </TabsContent>
      </Tabs>

      <ChatRoomFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateRoom}
        user={user}
      />
    </div>
  );
}
