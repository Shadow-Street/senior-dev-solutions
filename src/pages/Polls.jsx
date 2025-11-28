import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Plus,
  Search,
  TrendingUp,
  Users,
  Clock,
  Award,
  Star,
  Check,
} from "lucide-react";
import { toast } from 'sonner';

import PollCard from "../components/polls/PollCard";
import CreatePollModal from "../components/polls/CreatePollModal";
import VoteModal from "../components/polls/VoteModal";

// Sample data - NO DATABASE CALLS
const samplePolls = [
  {
    id: "sample-1",
    title: "Will NVIDIA (NVDA) stock close above $1,000 this week?",
    stock_symbol: "NVDA",
    poll_type: "price_target",
    target_price: 1000,
    target_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    yes_votes: 120,
    no_votes: 80,
    total_votes: 200,
    is_premium: false,
    created_by: "Guest",
    created_by_role: "guest",
    created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    description: "NVIDIA has been on a strong upward trend. Will it reach $1,000 by end of trading this Friday?",
    is_boosted: false,
  },
  {
    id: "sample-2",
    title: "Sentiment on Tesla (TSLA) for the next 3 months?",
    stock_symbol: "TSLA",
    poll_type: "sentiment",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    bullish_votes: 150,
    bearish_votes: 70,
    neutral_votes: 30,
    total_votes: 250,
    is_premium: false,
    created_by: "Advisor",
    created_by_role: "advisor",
    created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    description: "After recent announcements, what's your take on TSLA's performance in the coming quarter?",
    is_boosted: true,
  },
  {
    id: "sample-3",
    title: "Your action on Apple (AAPL) stock today?",
    stock_symbol: "AAPL",
    poll_type: "buy_sell_hold",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    buy_votes: 200,
    sell_votes: 50,
    hold_votes: 100,
    total_votes: 350,
    is_premium: false,
    created_by: "Community",
    created_by_role: "user",
    created_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    description: "Apple's latest earnings are out. What's your immediate action on the stock?",
    is_boosted: false,
  },
];

export default function Polls() {
  const [polls, setPolls] = useState(samplePolls);
  const [userVotes, setUserVotes] = useState({});
  const user = null; // Guest mode - no authentication
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    // No API calls - just set loading to false
    setIsLoading(false);
  }, []);

  const handleVote = (pollId, vote) => {
    toast.info("Feature demo - voting requires login");
  };

  const handleCreatePoll = (pollData) => {
    toast.info("Feature demo - poll creation requires login");
    setShowCreateModal(false);
  };

  const handleDeletePoll = (poll) => {
    toast.info("Feature demo - poll deletion requires login");
  };

  const filteredPolls = useMemo(() => {
    return polls.filter(poll => {
      const matchesSearch = poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (poll.stock_symbol && poll.stock_symbol.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesFilter = true;
      if (filter === 'premium') {
        matchesFilter = poll.is_premium === true;
      } else if (filter === 'free') {
        matchesFilter = !poll.is_premium;
      } else if (filter === 'advisor') {
        matchesFilter = poll.created_by_role === 'admin' || poll.created_by_role === 'advisor';
      }

      return matchesSearch && matchesFilter;
    });
  }, [polls, searchTerm, filter]);

  const userStats = {
    pollsVoted: 0,
    activeParticipants: 15,
    wonPolls: 0,
    successRate: 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-purple-700 bg-clip-text text-transparent">
              Community Polls
            </h1>
            <p className="text-slate-600 mt-1">Vote and make informed decisions together</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              <BarChart3 className="w-3 h-3 mr-1" />
              {polls.filter(p => p.is_active).length} Active
            </Badge>
            <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Polls Voted</p>
                  <p className="text-xl font-bold">{userStats.pollsVoted}</p>
                </div>
                <Check className="w-6 h-6 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-500 to-cyan-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Active Participants</p>
                  <p className="text-xl font-bold">{userStats.activeParticipants}</p>
                </div>
                <Users className="w-6 h-6 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">My Won Polls</p>
                  <p className="text-xl font-bold">{userStats.wonPolls}</p>
                </div>
                <Star className="w-6 h-6 text-amber-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm">Success Rate</p>
                  <p className="text-xl font-bold">{userStats.successRate}%</p>
                </div>
                <Award className="w-6 h-6 text-pink-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <Input
                placeholder="Search polls by title or stock symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            <div className="sm:w-52">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11">
                  <Clock className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="most_voted">Most Voted</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "All Polls", icon: BarChart3, color: "from-blue-500 to-purple-600" },
              { value: "premium", label: "Premium", icon: Star, color: "from-purple-500 to-pink-600" },
              { value: "free", label: "Free", icon: Users, color: "from-green-500 to-emerald-600" },
              { value: "advisor", label: "Advisor", icon: Award, color: "from-indigo-500 to-blue-600" },
            ].map(filterOption => (
              <Button
                key={filterOption.value}
                onClick={() => setFilter(filterOption.value)}
                size="sm"
                className={`h-9 px-4 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${
                  filter === filterOption.value
                    ? `bg-gradient-to-r ${filterOption.color} text-white shadow-lg scale-105`
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100'
                }`}
              >
                <filterOption.icon className="w-4 h-4" />
                {filterOption.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              user={user}
              userVote={userVotes[poll.id]}
              onVoteSubmit={(vote) => handleVote(poll.id, vote)}
              onPledge={() => {}}
              onViewDetails={() => {
                setSelectedPoll(poll);
                setShowVoteModal(true);
              }}
              onDelete={handleDeletePoll}
              userPledge={null}
            />
          ))}
        </div>

        <CreatePollModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          room={null}
          user={user}
          onCreatePoll={handleCreatePoll}
        />

        <VoteModal
          open={showVoteModal}
          onClose={() => setShowVoteModal(false)}
          poll={selectedPoll}
          userVote={selectedPoll ? userVotes[selectedPoll.id] : undefined}
          onVote={handleVote}
        />
      </div>
    </div>
  );
}