import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import StatTile from "@/components/common/StatTile";
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
    <div className="w-full bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-protocall-ink to-protocall-blue bg-clip-text text-transparent">
              Community Polls
            </h1>
            <p className="text-subtle mt-1">Vote and make informed decisions together</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-premium-muted text-protocall-premium-text">
              <BarChart3 className="w-3 h-3 mr-1" />
              {polls.filter(p => p.is_active).length} Active
            </Badge>
            <Button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          </div>
        </div>

        {/* Four distinct tones, matching the Dashboard and Portfolio rows.
            Three of these were previously the same purple, and the labels used
            text-white/80 — an opacity that drops the contrast below the 4.5:1
            floor on the lighter fills. StatTile keeps the text at full white
            and takes its hierarchy from size and weight instead. */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatTile
            title="Polls Voted"
            value={userStats.pollsVoted}
            icon={Check}
            tone="purple"
          />
          <StatTile
            title="Active Participants"
            value={userStats.activeParticipants}
            icon={Users}
            tone="green"
          />
          <StatTile
            title="My Won Polls"
            value={userStats.wonPolls}
            icon={Star}
            tone="blue"
          />
          <StatTile
            title="Success Rate"
            value={`${userStats.successRate}%`}
            icon={Award}
            tone="orange"
          />
        </div>

        <div className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
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
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
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
              { value: "all", label: "All Polls", icon: BarChart3, color: "from-protocall-deep to-protocall-blue" },
              { value: "premium", label: "Premium", icon: Star, color: "from-protocall-deep to-protocall-blue" },
              { value: "free", label: "Free", icon: Users, color: "from-buy to-buy-soft" },
              { value: "advisor", label: "Advisor", icon: Award, color: "from-protocall-deep to-protocall-blue" },
            ].map(filterOption => (
              <Button
                key={filterOption.value}
                onClick={() => setFilter(filterOption.value)}
                size="sm"
                className={`h-9 px-4 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${filter === filterOption.value
                  ? `bg-gradient-to-r ${filterOption.color} text-white shadow-lg scale-105`
                  : 'bg-background text-primary hover:from-surface-2 hover:to-surface-2'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
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
        {/* items-start: a cell that also carries an ad is much taller than a
            plain poll, and with the default stretch it dragged every card in
            that row to the same height, leaving a large empty band inside the
            shorter ones. Each cell now takes the height it needs. */}
        {!isLoading && filteredPolls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
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