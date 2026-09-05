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

import { Poll, PollVote } from "@/lib/apiClient";
import apiClient from '@/lib/apiClient';
import PollCard from "../components/polls/PollCard";
import CreatePollModal from "../components/polls/CreatePollModal";
import VoteModal from "../components/polls/VoteModal";
import ShareRoomModal from "../components/chat/ShareRoomModal";
import EmptyState from "../components/ui/EmptyState";
import PollCardSkeleton from "../components/ui/PollCardSkeleton";
import { useAuth } from "@/components/context/AuthContext";

import { usePollSocket } from "@/hooks/usePollSocket";

export default function Polls() {
  const { user } = useAuth(); // Use AuthContext instead of localStorage
  const [polls, setPolls] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [editingPoll, setEditingPoll] = useState(null); // ✅ State for editing poll
  const [sharePoll, setSharePoll] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Real-time updates
  const { onPollCreated, onPollUpdated } = usePollSocket(user);

  useEffect(() => {
    // Handle new polls from OTHER users (not current user to avoid duplicates)
    onPollCreated((newPoll) => {
      // ✅ Skip if poll was created by current user (already added locally)
      if (newPoll.created_by === user?.id) {
        return;
      }

      // ✅ Check for duplicates before adding
      setPolls(prev => {
        const exists = prev.some(p => p.id === newPoll.id);
        if (exists) return prev;
        return [newPoll, ...prev];
      });
      toast.info(`New poll created: ${newPoll.title}`);
    });

    // Handle poll updates (votes)
    onPollUpdated((updatedPoll) => {
      setPolls(prev => prev.map(poll =>
        poll.id === updatedPoll.id ? { ...poll, ...updatedPoll } : poll
      ));
    });
  }, [onPollCreated, onPollUpdated, user]);

  // Fetch polls from API
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        setIsLoading(true);
        const data = await Poll.list('created_at', 100);

        if (!data || data.length === 0) {
          console.log('No polls found');
          setPolls([]);
        } else {
          setPolls(data);
        }

        // Fetch user votes if logged in
        if (user) {
          try {
            // Fetch user-specific votes directly from the new reliable endpoint
            const response = await apiClient.get('/polls/votes/me');
            const votes = response.data;

            const votesMap = {};
            if (votes && Array.isArray(votes)) {
              votes.forEach(vote => {
                if (vote) {
                  votesMap[vote.poll_id] = vote;
                }
              });
            }
            setUserVotes(votesMap);
          } catch (voteError) {
            console.error("Failed to fetch user votes:", voteError);
            setUserVotes({});
          }
        }
      } catch (error) {
        console.error("Failed to fetch polls:", error);
        const errorMessage = error.response?.data?.message || error.message || "Failed to load polls";
        toast.error(errorMessage);
        setPolls([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolls();
  }, [user]);

  const handleVote = async (pollId, vote) => {
    if (!user) {
      toast.error("Please log in to vote");
      return;
    }

    // Map vote type to option_index
    const voteTypeMap = {
      'buy': 0, 'sell': 1, 'hold': 2,
      'bullish': 0, 'bearish': 1, 'neutral': 2,
      'yes': 0, 'no': 1
    };

    const option_index = voteTypeMap[vote];
    if (option_index === undefined) {
      toast.error('Invalid vote option');
      return;
    }

    try {
      // Submit vote using the /cast endpoint directly with apiClient
      const response = await apiClient.post('/polls/votes/cast', {
        poll_id: pollId,
        option_index
      });

      const voteData = response.data.vote;

      // Update local state
      setUserVotes(prev => ({ ...prev, [pollId]: { ...voteData, vote_value: vote } }));

      // Refresh polls to get updated counts
      const updatedPolls = await Poll.list('created_at', 100);
      if (updatedPolls && updatedPolls.length > 0) {
        setPolls(updatedPolls);
      }

      toast.success(response.data.message || "Vote submitted successfully!");
    } catch (error) {
      console.error("Failed to submit vote:", error);

      // Show user-friendly error message
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to submit vote. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleCreatePoll = async (pollData) => {
    if (!user) {
      toast.error("Please log in to create polls");
      return;
    }

    try {
      const newPoll = await Poll.create({
        ...pollData,
        created_by: user.id,
        created_by_role: user.app_role || user.role || 'user' // Use app_role first, fallback to role, then 'user'
      });

      if (newPoll) {
        setPolls(prev => [newPoll, ...prev]);
        setShowCreateModal(false);
        toast.success("Poll created successfully!");
      } else {
        throw new Error("Poll creation returned no data");
      }
    } catch (error) {
      console.error("Failed to create poll:", error);
      const errorMessage = error.response?.data?.message || "Failed to create poll. Please try again.";
      toast.error(errorMessage);
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleDeletePoll = async (poll) => {
    if (!user) {
      toast.error("Please log in to delete polls");
      return;
    }

    if (poll.created_by !== user.id && !['admin', 'super_admin'].includes(user.app_role)) {
      toast.error("You don't have permission to delete this poll");
      return;
    }

    try {
      await Poll.delete(poll.id);
      setPolls(prev => prev.filter(p => p.id !== poll.id));
      toast.success("Poll deleted successfully!");
    } catch (error) {
      console.error("Failed to delete poll:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete poll. Please try again.";
      toast.error(errorMessage);
    }
  };

  // ✅ Handle edit poll
  const handleEditPoll = (poll) => {
    if (!user) {
      toast.error("Please log in to edit polls");
      return;
    }

    if (poll.created_by !== user.id && !['admin', 'super_admin'].includes(user.app_role)) {
      toast.error("You don't have permission to edit this poll");
      return;
    }

    setEditingPoll(poll);
    setShowCreateModal(true);
  };

  const filteredPolls = useMemo(() => {
    return polls.filter(poll => {
      // Add null/undefined checks
      if (!poll) return false;

      const matchesSearch = (poll.title && poll.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (poll.stock_symbol && poll.stock_symbol.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesFilter = true;
      if (filter === 'premium') {
        matchesFilter = poll.is_premium === true;
      } else if (filter === 'free') {
        matchesFilter = poll.is_premium !== true;
      } else if (filter === 'advisor') {
        matchesFilter = poll.created_by_role === 'admin' || poll.created_by_role === 'advisor';
      }
      // New status filters
      if (filter === "active" && poll.status !== "active") return false;
      if (filter === "closed" && poll.status !== "closed") return false;

      return matchesSearch && matchesFilter;
    });
  }, [polls, searchTerm, filter]);

  // Calculate user stats from actual data
  const userStats = useMemo(() => {
    const pollsVoted = Object.keys(userVotes).length;
    const totalParticipants = new Set(
      polls.flatMap(poll =>
        Object.keys(userVotes).filter(voteKey => voteKey === poll.id)
      )
    ).size;

    // Calculate won polls (where user voted for winning option)
    const wonPolls = polls.filter(poll => {
      const userVote = userVotes[poll.id];
      if (!userVote || poll.is_active) return false;

      // Determine winning option based on poll type
      if (poll.poll_type === 'price_target') {
        return userVote.vote_value === (poll.yes_votes > poll.no_votes ? 'yes' : 'no');
      } else if (poll.poll_type === 'sentiment') {
        const max = Math.max(poll.bullish_votes || 0, poll.bearish_votes || 0, poll.neutral_votes || 0);
        if (poll.bullish_votes === max) return userVote.vote_value === 'bullish';
        if (poll.bearish_votes === max) return userVote.vote_value === 'bearish';
        return userVote.vote_value === 'neutral';
      }
      return false;
    }).length;

    const successRate = pollsVoted > 0 ? Math.round((wonPolls / pollsVoted) * 100) : 0;

    return {
      pollsVoted,
      activeParticipants: totalParticipants || 15, // Fallback to estimated value
      wonPolls,
      successRate
    };
  }, [polls, userVotes]);

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
                className={`h-9 px-4 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${filter === filterOption.value
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

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <PollCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPolls.length === 0 && (
          <EmptyState
            icon={searchTerm ? Search : BarChart3}
            title={searchTerm ? "No Polls Found" : "No Polls Available"}
            description={
              searchTerm
                ? `No polls match "${searchTerm}". Try a different search term.`
                : user
                  ? "Be the first to create a poll and start the conversation!"
                  : "Login to create polls and participate in community voting."
            }
            action={user && !searchTerm ? {
              label: "Create Your First Poll",
              onClick: () => setShowCreateModal(true)
            } : null}
          />
        )}

        {/* Polls Grid */}
        {!isLoading && filteredPolls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                user={user}
                userVote={userVotes[poll.id]}
                onVoteSubmit={(vote) => handleVote(poll.id, vote)}
                onPledge={() => { }}
                onViewDetails={() => {
                  setSelectedPoll(poll);
                  setShowVoteModal(true);
                }}
                onDelete={handleDeletePoll}
                onEdit={handleEditPoll} // ✅ Added edit handler
                onShare={setSharePoll}
                userPledge={null}
              />
            ))}
          </div>
        )}

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

        <ShareRoomModal
          open={!!sharePoll}
          onClose={() => setSharePoll(null)}
          shareLink={sharePoll ? `${window.location.origin}/polls/${sharePoll.id}` : ""}
          title="Share Poll"
          shareText={sharePoll ? `Vote on this poll: ${sharePoll.title}` : "Check out this poll!"}
        />
      </div>
    </div>
  );
}