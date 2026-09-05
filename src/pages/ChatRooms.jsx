import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Users,
  Plus,
  Search,
  TrendingUp,
  Building,
  Shield,
  Crown,
  RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import ChatRoomCard from "../components/chat/ChatRoomCard";
import CreateRoomModal from "../components/chat/CreateRoomModal";
import ShareRoomModal from "../components/chat/ShareRoomModal";
import ChatInterface from "../components/chat/ChatInterface";
import { ChatRoom } from "@/api/entities";

import { authAPI } from "@/lib/apiClient";

export default function ChatRooms() {
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareRoom, setShareRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const ensureUser = async () => {
      if (!user && localStorage.getItem('accessToken')) {
        try {
          const u = await authAPI.me();
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        } catch (e) {
          console.error("Failed to fetch user:", e);
        }
      }
    };
    ensureUser();
  }, [user]);

  // Fetch chat rooms from API
  const fetchChatRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const rooms = await ChatRoom.list('created_at', 100);
      setChatRooms(rooms || []);
    } catch (error) {
      console.error("Failed to fetch chat rooms:", error);
      toast.error("Failed to load chat rooms");
      setChatRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh rooms
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchChatRooms();
    setIsRefreshing(false);
    toast.success("Rooms refreshed");
  };

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  const handleCreateRoom = async (roomData) => {
    if (!user) {
      toast.error("Please login to create a room");
      setShowCreateModal(false);
      return;
    }

    try {
      const newRoom = await ChatRoom.create({
        ...roomData,
        created_by: user.email,
        participant_count: 1
      });

      setChatRooms(prev => [newRoom, ...prev]);
      toast.success("Room created successfully!");
      setShowCreateModal(false);
    } catch (error) {
      console.error("Failed to create room:", error);
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        (error.message && error.message.includes('exists') ? error.message : "Failed to create room");
      toast.error(errorMessage);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await ChatRoom.delete(roomId);
      setChatRooms(prev => prev.filter(r => r.id !== roomId));
      toast.success("Room deleted");
    } catch (error) {
      console.error("Failed to delete room:", error);
      toast.error("Failed to delete room");
    }
  };

  const filteredRooms = chatRooms.filter((room) => {
    const matchesSearch = room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filter === "admin") {
      matchesFilter = room.room_type === "admin" || room.room_type === "premium_admin" || room.admin_only_post;
    } else if (filter === "premium") {
      matchesFilter = room.is_premium || room.room_type === "premium" || room.room_type === "premium_admin";
    } else if (filter !== "all") {
      matchesFilter = room.room_type === filter;
    }

    return matchesSearch && matchesFilter;
  });

  const totalParticipants = chatRooms.reduce((sum, room) => sum + (room.participant_count || 0), 0);

  if (selectedRoom) {
    return (
      <ChatInterface
        room={selectedRoom}
        user={user}
        onBack={() => setSelectedRoom(null)}
        onUpdateRoom={fetchChatRooms}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Trading Chat Rooms
            </h1>
            <p className="text-slate-500 text-lg mt-1">Connect with fellow retail investors</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 px-3 py-1 text-sm border-emerald-100">
              <Users className="w-4 h-4 mr-2" />
              {totalParticipants} Active
            </Badge>
            <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-200">
              <Plus className="w-4 h-4 mr-2" />
              Create Room
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search chat rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white shadow-sm border-slate-200 text-base"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            {[
              { value: "all", label: "All", icon: MessageSquare },
              { value: "stock_specific", label: "Stocks", icon: TrendingUp },
              { value: "sector", label: "Sectors", icon: Building },
              { value: "general", label: "General", icon: Users },
              { value: "admin", label: "Admin", icon: Shield },
              { value: "premium", label: "Premium", icon: Crown }
            ].map((filterOption) => (
              <Button
                key={filterOption.value}
                onClick={() => setFilter(filterOption.value)}
                variant="ghost"
                className={`h-9 rounded-full font-medium transition-all duration-300 px-4 ${filter === filterOption.value
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm border border-slate-200'
                  }`}
              >
                {filterOption.icon && <filterOption.icon className="w-4 h-4 mr-2" />}
                {filterOption.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <ChatRoomCard
                key={room.id}
                room={room}
                user={user}
                onRoomClick={setSelectedRoom}
                onDelete={handleDeleteRoom}
                onShare={setShareRoom}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No chat rooms found</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || filter !== 'all'
                ? "Try adjusting your search or filters"
                : "Be the first to create a chat room!"}
            </p>
            {chatRooms.length === 0 && (
              <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Room
              </Button>
            )}
          </div>
        )}

        <CreateRoomModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={handleCreateRoom}
        />

        <ShareRoomModal
          open={!!shareRoom}
          room={shareRoom}
          onClose={() => setShareRoom(null)}
        />
      </div>
    </div>
  );
}
