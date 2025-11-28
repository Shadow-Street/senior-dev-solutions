import React, { useState, useEffect, useRef } from 'react';
import { Message, ChatRoom, ChatRoomParticipant, TypingIndicator } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Eye
} from 'lucide-react';

export default function RealTimeActivityMonitor() {
  const [liveData, setLiveData] = useState({
    recentMessages: [],
    activeRooms: [],
    onlineUsers: [],
    typingUsers: [],
    stats: {
      messagesPerMinute: 0,
      activeUsers: 0,
      activeRooms: 0,
      peakActivity: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const pollingInterval = useRef(null);

  const loadLiveData = async () => {
    try {
      if (!isMounted.current) return;

      const [messages, rooms, participants] = await Promise.all([
        Message.list('-created_date', 50).catch(() => []),
        ChatRoom.list().catch(() => []),
        ChatRoomParticipant.list('-last_seen_at', 100).catch(() => [])
      ]);

      if (!isMounted.current) return;

      // Calculate recent activity (last minute)
      const oneMinuteAgo = Date.now() - 60000;
      const recentMessages = messages.filter(m => 
        new Date(m.created_date).getTime() > oneMinuteAgo
      );

      // Find active rooms (with recent messages)
      const activeRoomIds = new Set(recentMessages.map(m => m.chat_room_id));
      const activeRooms = rooms.filter(r => activeRoomIds.has(r.id));

      // Find online users (active in last 5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      const onlineUsers = participants.filter(p => 
        p.last_seen_at && new Date(p.last_seen_at).getTime() > fiveMinutesAgo
      );

      // Calculate stats
      const uniqueActiveUsers = new Set(recentMessages.map(m => m.user_id).filter(Boolean));

      setLiveData({
        recentMessages: messages.slice(0, 20),
        activeRooms: activeRooms.slice(0, 10),
        onlineUsers: onlineUsers.slice(0, 20),
        typingUsers: [],
        stats: {
          messagesPerMinute: recentMessages.length,
          activeUsers: uniqueActiveUsers.size,
          activeRooms: activeRooms.length,
          peakActivity: Math.max(recentMessages.length, liveData.stats.peakActivity || 0)
        }
      });

    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    
    // Initial load
    loadLiveData();

    // Set up polling every 5 seconds for real-time updates
    pollingInterval.current = setInterval(() => {
      if (isMounted.current) {
        loadLiveData();
      }
    }, 5000);

    return () => {
      isMounted.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Live Activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Messages/Min</p>
                <p className="text-3xl font-bold">{liveData.stats.messagesPerMinute}</p>
              </div>
              <MessageSquare className="w-10 h-10 opacity-80" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-xs opacity-90">Live Updates</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Users</p>
                <p className="text-3xl font-bold">{liveData.stats.activeUsers}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs opacity-90">Online Now</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-violet-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Rooms</p>
                <p className="text-3xl font-bold">{liveData.stats.activeRooms}</p>
              </div>
              <MessageSquare className="w-10 h-10 opacity-80" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs opacity-90">With Activity</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Peak Activity</p>
                <p className="text-3xl font-bold">{liveData.stats.peakActivity}</p>
              </div>
              <TrendingUp className="w-10 h-10 opacity-80" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs opacity-90">msgs/min</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-600" />
              Live Message Stream
              <Badge className="bg-green-100 text-green-800 ml-auto">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveData.recentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">No recent messages</p>
                </div>
              ) : (
                liveData.recentMessages.map((message, index) => (
                  <div key={message.id || index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {message.user_id?.slice(-6) || 'System'}
                        </p>
                        <span className="text-xs text-slate-500">
                          {new Date(message.created_date).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Active Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveData.activeRooms.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">No active rooms</p>
                </div>
              ) : (
                liveData.activeRooms.map((room, index) => (
                  <div key={room.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{room.name}</p>
                        <p className="text-xs text-slate-500">{room.room_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {room.participant_count || 0}
                      </Badge>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Online Users ({liveData.onlineUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {liveData.onlineUsers.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No users online</p>
              </div>
            ) : (
              liveData.onlineUsers.map((participant, index) => (
                <div key={participant.id || index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    {participant.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {participant.user_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {participant.role || 'member'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Auto-refreshing every 5 seconds</span>
      </div>
    </div>
  );
}