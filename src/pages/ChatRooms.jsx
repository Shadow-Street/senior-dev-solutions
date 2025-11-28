import React, { useState, useEffect } from "react";
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
  Crown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import ChatRoomCard from "../components/chat/ChatRoomCard";
import CreateRoomModal from "../components/chat/CreateRoomModal";
import ChatInterface from "../components/chat/ChatInterface";
// import "./../components/chat/ChatRoomCard.css";

// Sample data - NO DATABASE CALLS
const sampleRooms = [
  {
    id: '1',
    name: 'RELIANCE Traders Hub',
    description: 'Discuss Reliance Industries stock movements, earnings, and trading strategies',
    stock_symbol: 'RELIANCE',
    room_type: 'stock_specific',
    participant_count: 156
  },
  {
    id: '2',
    name: 'IT Sector Discussion',
    description: 'Chat about TCS, Infosys, Wipro and other IT stocks',
    room_type: 'sector',
    participant_count: 89
  },
  {
    id: '3',
    name: 'Banking Stocks United',
    description: 'HDFC Bank, ICICI Bank and other banking sector discussions',
    room_type: 'sector',
    participant_count: 134
  },
  {
    id: '4',
    name: 'General Trading Room',
    description: 'Open discussion for all retail traders',
    room_type: 'general',
    participant_count: 267
  },
  {
    id: '5',
    name: 'TCS Earnings Call',
    description: 'Live discussion during TCS quarterly results',
    stock_symbol: 'TCS',
    room_type: 'stock_specific',
    is_meeting_active: true,
    participant_count: 78
  },
  {
    id: '6',
    name: 'Admin Announcements',
    description: 'Official updates and stock recommendations from admins',
    room_type: 'admin',
    participant_count: 1205,
    admin_only_post: true
  }
];

export default function ChatRooms() {
  const [chatRooms, setChatRooms] = useState(sampleRooms);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const user = null; // Guest mode - no authentication

  useEffect(() => {
    // No API calls - just set loading to false
    setIsLoading(false);
  }, []);

  const handleCreateRoom = (roomData) => {
    toast.info("Feature demo - room creation requires login");
    setShowCreateModal(false);
  };

  const filteredRooms = chatRooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  if (selectedRoom) {
    return (
      <ChatInterface
        room={selectedRoom}
        user={user}
        onBack={() => setSelectedRoom(null)}
        onUpdateRoom={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent">
              Trading Chat Rooms
            </h1>
            <p className="text-slate-600 mt-1">Connect with fellow retail investors</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <Users className="w-3 h-3 mr-1" />
              {chatRooms.reduce((sum, room) => sum + (room.participant_count || 0), 0)} Active
            </Badge>
            <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Room
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search chat rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "All Rooms", icon: MessageSquare },
              { value: "stock_specific", label: "Stocks", icon: TrendingUp },
              { value: "sector", label: "Sectors", icon: Building },
              { value: "general", label: "General", icon: Users },
              { value: "admin", label: "Admin", icon: Shield },
              { value: "premium", label: "Premium", icon: Crown }
            ].map((filterOption) => (
              <Button
                key={filterOption.value}
                onClick={() => setFilter(filterOption.value)}
                className={`h-9 text-xs sm:text-sm rounded-xl font-semibold shadow-md flex items-center gap-2 px-2 sm:px-3 py-2.5 transition-all duration-300 ${
                  filter === filterOption.value
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-500 hover:to-purple-600 hover:text-white'
                }`}
              >
                <filterOption.icon className="w-4 h-4" />
                {filterOption.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <ChatRoomCard
              key={room.id}
              room={room}
              user={user}
              onRoomClick={setSelectedRoom}
              onDelete={() => {}}
            />
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No chat rooms found</h3>
            <p className="text-slate-500 mb-4">Try adjusting your search</p>
          </div>
        )}

        <CreateRoomModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={handleCreateRoom}
        />
      </div>
    </div>
  );
}