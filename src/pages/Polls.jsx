import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import StatTile from "@/components/common/StatTile";
import pollsBanner from "@/assets/brand/polls-bull-bear.webp";
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
import { POLL_GRID_CLASS, buildPollGridCells } from "../components/polls/PollGrid";
import { useAdsEnabled } from "@/components/hooks/useAdsEnabled";
import CreatePollModal from "../components/polls/CreatePollModal";
import ShareRoomModal from "../components/chat/ShareRoomModal";
import EmptyState from "../components/ui/EmptyState";
import PollCardSkeleton from "../components/ui/PollCardSkeleton";
import { getPollTally } from "@/lib/pollVotes";
import { useAuth } from "@/components/context/AuthContext";

import { usePollSocket } from "@/hooks/usePollSocket";

export default function Polls() {
  const { user } = useAuth(); // Use AuthContext instead of localStorage
  const adsEnabled = useAdsEnabled();
  const [polls, setPolls] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // PollCard has already cast the vote; just remember it so the card stays in
  // its "You voted" state when the list re-renders.
  const handleVoteRecorded = (pollId, vote) => {
    if (vote) setUserVotes(prev => ({ ...prev, [pollId]: vote }));
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
    }).sort((a, b) => {
      const created = (p) => new Date(p.created_at || p.created_date || 0).getTime();
      if (sortBy === "newest") return created(b) - created(a);
      const votes = (p) => getPollTally(p).total;
      // "Trending": most votes among polls from the last 7 days first.
      if (sortBy === "trending") {
        const recent = (p) => (Date.now() - created(p) < 7 * 24 * 60 * 60 * 1000 ? 1 : 0);
        return recent(b) - recent(a) || votes(b) - votes(a) || created(b) - created(a);
      }
      return votes(b) - votes(a) || created(b) - created(a);
    });
  }, [polls, searchTerm, filter, sortBy]);

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
      <div className="max-w-[1680px] mx-auto space-y-6">
        {/* Header banner: bull (BUY) vs bear (SELL) artwork, the poll's two
            sides. A dark scrim sits under the copy so white text stays above
            4.5:1 over both the green and the red halves. */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-protocall-ink text-white shadow-sm">
          <img
            src={pollsBanner}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-protocall-ink/85 via-protocall-ink/45 to-protocall-ink/80"
          />
          <div className="flex min-h-[150px] flex-col justify-between gap-4 p-5 sm:p-7 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Community Polls
              </h1>
              <p className="mt-1 text-white/90">Vote and make informed decisions together</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white backdrop-blur-sm">
                <BarChart3 className="w-3 h-3 mr-1" />
                {polls.filter(p => p.is_active).length} Active
              </Badge>
              <Button onClick={() => setShowCreateModal(true)} className="bg-buy text-buy-foreground font-semibold hover:bg-buy-soft">
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Button>
            </div>
          </div>
        </section>

        {/* Four distinct tones, matching the Dashboard and Portfolio rows.
            Three of these were previously the same purple, and the labels used
            text-white/80 — an opacity that drops the contrast below the 4.5:1
            floor on the lighter fills. StatTile keeps the text at full white
            and takes its hierarchy from size and weight instead. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
                placeholder="Search polls or stock symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search polls"
                className="h-11 rounded-lg border border-protocall-premium-light bg-white pl-10 pr-4 transition-all duration-200
                           placeholder:text-muted-foreground hover:border-primary/40
                           focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
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

          {/* Filter tabs, same pattern as the Chat Rooms filter: the selected
              tab is a filled primary pill with a soft glow; the others are
              white with a visible border and a hover state. */}
          <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter polls">
            {[
              { value: "all", label: "All Polls", icon: BarChart3 },
              { value: "premium", label: "Premium", icon: Star },
              { value: "free", label: "Free", icon: Users },
              { value: "advisor", label: "Advisor", icon: Award },
            ].map(filterOption => {
              const selected = filter === filterOption.value;
              return (
                <Button
                  key={filterOption.value}
                  type="button"
                  onClick={() => setFilter(filterOption.value)}
                  variant="ghost"
                  aria-pressed={selected}
                  className={`h-9 rounded-full px-4 font-semibold transition-all duration-200 ${selected
                    ? 'border border-primary bg-primary text-primary-foreground shadow-[0_0_0_3px_rgba(109,40,217,0.15)] hover:bg-primary hover:text-primary-foreground'
                    : 'border border-border bg-white text-foreground shadow-sm hover:border-primary/40 hover:bg-premium-muted hover:text-premium-muted-foreground'
                    }`}
                >
                  <filterOption.icon className="mr-2 h-4 w-4" />
                  {filterOption.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
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

        {/* Polls grid. A real CSS grid: every card in a row stretches to the
            row's height and pins its actions to the bottom (PollCard), so rows
            line up. A sponsored card is its own grid item, ahead of the poll
            it belongs to. */}
        {!isLoading && filteredPolls.length > 0 && (
          <div className={POLL_GRID_CLASS}>
            {buildPollGridCells(
              filteredPolls,
              (poll) => (
                <PollCard
                  poll={poll}
                  user={user}
                  userVote={userVotes[poll.id]}
                  withAd={false}
                  onVoteSubmit={(vote) => handleVoteRecorded(poll.id, vote)}
                  onDelete={handleDeletePoll}
                  onEdit={handleEditPoll}
                  onShare={setSharePoll}
                  userPledge={null}
                />
              ),
              adsEnabled,
            )}
          </div>
        )}

        <CreatePollModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          room={null}
          user={user}
          onCreatePoll={handleCreatePoll}
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