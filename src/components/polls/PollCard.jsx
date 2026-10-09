import React, { useState, useEffect, useMemo } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Crown,
  Shield,
  Lock,
  Star,
  MoreVertical,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Ban,
  Clock,
  Zap,
  Flame,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePlatformSettings } from "../hooks/usePlatformSettings";
import { useSubscription } from "@/components/hooks/useSubscription";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdDisplay from '../dashboard/AdDisplay';
import { toast } from 'sonner';
import { Subscription, Poll } from '@/api/entities';
import apiClient from '@/lib/apiClient';
import { format } from 'date-fns';
import PremiumAccessOverlay from '../common/PremiumAccessOverlay';

export default function PollCard({ poll, user, userVote, onVoteSubmit, onViewDetails, onDelete, onEdit, isLocked, userPledge, onShare }) {
  const { settings, isLoading: settingsLoading } = usePlatformSettings();
  const subscriptionContext = useSubscription();
  // A poll image that 404s should disappear, not leave an empty frame.
  const [imageFailed, setImageFailed] = useState(false);
  // Whether this cell shows an ad.
  //
  // This was `Math.random() < 0.2` evaluated inline during render, so the
  // ad appeared and vanished on every re-render — casting a vote could make
  // it pop in or out and visibly reflow the grid. Deriving it from the poll
  // id keeps roughly the same 1-in-5 rate while staying stable for a given
  // poll, which is also what render purity requires.
  const showAd = useMemo(() => {
    const id = String(poll?.id ?? '');
    if (!id) return false;
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return hash % 5 === 0;
  }, [poll?.id]);

  /**
   * Per-card accent colour.
   *
   * Decorative, not semantic: a poll carries several sentiments at once (buy,
   * sell, hold), so one colour cannot stand for its result, and using the
   * buy/sell palette here would imply a recommendation the poll does not make.
   * The five tones are the AA-safe tile colours already in the palette — the
   * same ones the dashboard uses — so no new hue enters the design.
   *
   * Derived from the poll id rather than the render order, so a card keeps its
   * colour when the list is filtered, sorted or re-rendered. Picking by index
   * would make every card change colour as soon as a search narrowed the grid.
   */
  const tone = useMemo(() => {
    const TONES = ['purple', 'blue', 'green', 'orange', 'ink'];
    const id = String(poll?.id ?? '');
    if (!id) return TONES[0];
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
    return TONES[hash % TONES.length];
  }, [poll?.id]);

  const toneClasses = {
    purple: { bar: 'bg-tile-purple', disc: 'bg-tile-purple', ring: 'group-hover:ring-tile-purple/30' },
    blue:   { bar: 'bg-tile-blue',   disc: 'bg-tile-blue',   ring: 'group-hover:ring-tile-blue/30' },
    green:  { bar: 'bg-tile-green',  disc: 'bg-tile-green',  ring: 'group-hover:ring-tile-green/30' },
    orange: { bar: 'bg-tile-orange', disc: 'bg-tile-orange', ring: 'group-hover:ring-tile-orange/30' },
    ink:    { bar: 'bg-tile-ink',    disc: 'bg-tile-ink',     ring: 'group-hover:ring-tile-ink/30' },
  }[tone];

  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Local state for optimistic updates
  const [localUserVote, setLocalUserVote] = useState(userVote || null);
  const [localPollData, setLocalPollData] = useState(poll);
  const [isVoting, setIsVoting] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  // Sync props to local state
  useEffect(() => {
    setLocalUserVote(userVote);
  }, [userVote]);

  useEffect(() => {
    setLocalPollData(poll);
  }, [poll]);

  // Derived state
  const isBoosted = localPollData.is_boosted &&
    localPollData.boost_expires_at &&
    new Date(localPollData.boost_expires_at) > new Date();

  const isExpired = localPollData.expires_at && new Date(localPollData.expires_at) <= new Date();

  const getTimeRemaining = () => {
    if (!localPollData.expires_at) return null;
    const now = new Date();
    const expiryDate = new Date(localPollData.expires_at);
    const diff = expiryDate - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const timeRemaining = getTimeRemaining();

  // ✅ Premium Access Check using subscription features
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!poll.is_premium || !user) {
        setHasAccess(!poll.is_premium);
        setIsCheckingAccess(false);
        return;
      }

      // Admin/SuperAdmin bypass
      if (['admin', 'super_admin'].includes(user.app_role)) {
        setHasAccess(true);
        setIsCheckingAccess(false);
        return;
      }

      // ✅ Check subscription features
      const canViewPremiumPolls = subscriptionContext?.hasFeatureAccess?.('premium_polls');
      setHasAccess(!!canViewPremiumPolls);
      setIsCheckingAccess(false);
    };

    checkUserAccess();
  }, [user, poll.is_premium, subscriptionContext]);

  const isAdvisorPoll = poll.created_by_admin || poll.created_by_role === 'admin' || poll.created_by_role === 'advisor';
  const isPremiumDesign = poll.is_premium || isAdvisorPoll;
  const isAdmin = user && ['admin', 'super_admin'].includes(user.app_role);
  const isCreator = user && user.id === poll.created_by;
  const canAccessPollContent = isAdmin || (poll.is_premium ? hasAccess : true);
  const canBoost = user && (isCreator || isAdmin);
  const canEditDelete = isCreator || isAdmin;

  // Data Preparation
  const totalVotes = localPollData.total_votes || 0;
  const pollVotes = localPollData.votes || {};
  const pollOptions = localPollData.options || [];

  const iconMap = {
    'Buy': TrendingUp, 'Sell': TrendingDown, 'Hold': Minus,
    'Bullish': TrendingUp, 'Bearish': TrendingDown, 'Neutral': Minus,
    'Yes': CheckCircle, 'No': Ban
  };

  const colorMap = {
    'Buy': { color: 'text-buy-muted-foreground', bgColor: 'bg-buy' },
    'Sell': { color: 'text-sell-muted-foreground', bgColor: 'bg-sell' },
    'Hold': { color: 'text-hold-muted-foreground', bgColor: 'bg-hold' },
    'Bullish': { color: 'text-buy-muted-foreground', bgColor: 'bg-buy' },
    'Bearish': { color: 'text-sell-muted-foreground', bgColor: 'bg-sell' },
    'Neutral': { color: 'text-hold-muted-foreground', bgColor: 'bg-hold' },
    'Yes': { color: 'text-buy-muted-foreground', bgColor: 'bg-buy' },
    'No': { color: 'text-sell-muted-foreground', bgColor: 'bg-sell' }
  };

  let voteData = {};
  if (pollOptions.length > 0) {
    pollOptions.forEach((option, index) => {
      const voteCount = pollVotes[index] || 0;
      const colors = colorMap[option] || { color: 'text-primary', bgColor: 'bg-primary' };
      voteData[index] = {
        icon: iconMap[option] || Star,
        ...colors,
        label: option,
        count: voteCount,
        percentage: totalVotes > 0 ? (voteCount / totalVotes * 100) : 0,
      };
    });
  }

  const getWinningVote = () => {
    const votes = Object.entries(voteData).map(([type, data]) => ({
      type: data.label,
      count: data.count,
      percentage: data.percentage
    }));

    if (totalVotes === 0) {
      return { type: 'none', count: 0, percentage: 0 };
    }
    return votes.reduce((a, b) => a.count > b.count ? a : b);
  };

  const winningVote = getWinningVote();

  // Handlers
  const handleBoostPoll = async () => {
    if (!canBoost) {
      toast.error("You don't have permission to boost this poll");
      return;
    }
    setIsBoosting(true);
    try {
      const boostExpiry = new Date();
      boostExpiry.setHours(boostExpiry.getHours() + 24);

      await Poll.update(poll.id, {
        is_boosted: true,
        boost_expires_at: boostExpiry.toISOString(),
        boosted_by: user.id
      });

      setLocalPollData({
        ...localPollData,
        is_boosted: true,
        boost_expires_at: boostExpiry.toISOString(),
        boosted_by: user.id
      });
      toast.success('Poll boosted for 24 hours!');
    } catch (error) {
      console.error('Error boosting poll:', error);
      toast.error('Failed to boost poll');
    } finally {
      setIsBoosting(false);
    }
  };

  const handleSharePoll = () => {
    if (onShare) {
      onShare(poll);
    }
  };

  const handleQuickVote = async (vote) => {
    if (!user) {
      toast.error("Please log in to vote");
      return;
    }

    if (isExpired) {
      toast.error("This poll has expired");
      return;
    }

    setIsVoting(true);

    const previousPollData = { ...localPollData };
    const previousUserVote = localUserVote;

    const voteTypeMap = {
      'buy': 0, 'sell': 1, 'hold': 2,
      'bullish': 0, 'bearish': 1, 'neutral': 2,
      'yes': 0, 'no': 1
    };

    const option_index = voteTypeMap[vote.toLowerCase()];
    if (option_index === undefined) {
      toast.error('Invalid vote option');
      setIsVoting(false);
      return;
    }

    // Optimistic Update
    const voteField = `${vote.toLowerCase()}_votes`;
    const newPollData = {
      ...localPollData,
      [voteField]: (localPollData[voteField] || 0) + 1,
      total_votes: (localPollData.total_votes || 0) + 1
    };

    // IMPORTANT: Set localUserVote to an object mimicking the backend response
    setLocalUserVote({
      poll_id: poll.id,
      user_id: user.id,
      option_index: option_index,
      vote_value: vote // optional helper
    });

    setLocalPollData(newPollData);

    try {
      const response = await apiClient.post('/polls/votes/cast', {
        poll_id: poll.id,
        option_index
      });

      toast.success(response.data.message || "Your vote has been recorded!");

      const updatedPoll = await Poll.get(poll.id);
      if (updatedPoll) {
        setLocalPollData(updatedPoll);
      }

      if (onVoteSubmit) {
        onVoteSubmit(vote).catch(() => { });
      }

    } catch (error) {
      console.error('Quick vote error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit vote.';
      toast.error(errorMessage);

      // Rollback
      setLocalPollData(previousPollData);
      setLocalUserVote(previousUserVote);
    } finally {
      setIsVoting(false);
    }
  };

  // No early return for premium anymore, we handle it with overlay

  if (!poll.is_active) {
    return (
      <Card className="border-2 border-dashed border-border bg-surface-2/50 relative p-6">
        <div className="absolute inset-0 bg-border/70 flex items-center justify-center z-10">
          <div className="text-center">
            <Ban className="w-8 h-8 text-subtle mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Poll Suspended</h3>
          </div>
        </div>
        <div className="opacity-50 space-y-4">
          <h3 className="font-bold text-subtle">{poll.stock_symbol}</h3>
          {/* Show grayed out results */}
          <div className="space-y-3">
            {Object.entries(voteData).map(([voteType, data]) => (
              <div key={voteType} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{data.label}</span>
                  <span>{data.count}</span>
                </div>
                <div className="h-2 bg-border rounded-full w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    // flex column rather than space-y, which adds margins that fight the
    // layout. Deliberately no h-full: a percentage height on a grid item
    // resolves against the grid *area*, so it re-stretched cells back to the
    // tallest in the row and undid the grid's items-start — which is what left
    // a 344px empty band inside cards sitting beside an ad.
    <div className="flex flex-col gap-4">
      {showAd && (
        <AdDisplay
          placement="polls"
          userContext={{ stock_symbol: poll.stock_symbol }}
        />
      )}

      <TooltipProvider>
        {/* h-full + flex column: the grid already stretches every card in a row
            to the same height, but the content was top-aligned inside it, so
            the vote bars, stats and action buttons landed at different heights
            from card to card. Making the card a column lets the block below be
            pinned to the bottom, which is what lines the rows up. */}
        <Card className={`flex flex-col overflow-hidden transition-all duration-300 border-0 relative group ${isBoosted ? 'ring-2 ring-hold shadow-xl' : ''
          } ${isPremiumDesign ? "shadow-lg bg-gradient-to-br from-white to-surface-2 hover:shadow-xl transform hover:-translate-y-1" : "bg-white hover:shadow-lg"} ${isLocked ? 'locked-poll-card' : ''}`}>

          {/* Per-card accent. overflow-hidden on the Card keeps it inside the
              rounded corners. Boosted polls already carry a ring, so the bar
              sits under it rather than competing with it. */}
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-1.5 z-20 ${toneClasses.bar}`}
          />

          {poll.is_premium && !canAccessPollContent && !isAdmin && (
            <PremiumAccessOverlay
              title="Premium Poll"
              message="Get deeper insights with our expert community analysis. Subscribe to participate."
            />
          )}

          {isBoosted && (
            <div className="absolute inset-0 bg-hold opacity-20 animate-pulse z-0"></div>
          )}

          {poll.is_premium && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-protocall-grape to-protocall-blue opacity-10 rounded-full transform translate-x-16 -translate-y-16 z-0"></div>
          )}

          {/* gap-4, not space-y-4: the space-y selector
              (`.space-y-4 > :not([hidden]) ~ :not([hidden])`) outranks the
              `mt-auto` below it and was silently resetting it to 16px, so the
              bottom-anchoring never took effect. gap sets no margins. */}
          <div className="relative z-10 flex flex-1 flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {/* White on these five tones measures 5.02:1 or better, so
                      the initial stays legible on every one of them. */}
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                                text-sm font-bold text-tile-foreground shadow-sm
                                transition-transform duration-300 group-hover:scale-105
                                motion-reduce:transform-none motion-reduce:transition-none
                                ${toneClasses.disc}`}
                  >
                    {String(poll.stock_symbol || '?').charAt(0).toUpperCase()}
                  </span>
                  <CardTitle className="text-lg font-bold text-foreground leading-tight">
                    {poll.stock_symbol}
                  </CardTitle>
                  {isBoosted && (
                    <Badge className="bg-hold text-hold-foreground border-0 shadow-md animate-pulse">
                      <Flame className="w-3 h-3 mr-1" />
                      Boosted
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {poll.is_premium ? (
                  <Badge className="bg-gradient-to-r from-protocall-deep to-protocall-blue text-white border-0 shadow-md">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                ) : isAdvisorPoll && (
                  <Badge className="bg-premium-muted text-protocall-premium-text border border-protocall-premium-light text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Advisor
                  </Badge>
                )}

                {timeRemaining && !isExpired && (
                  <Badge variant="outline" className="bg-hold-muted text-hold-muted-foreground border-hold/30 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeRemaining}
                  </Badge>
                )}

                {(canEditDelete || canBoost) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canBoost && !isBoosted && (
                        <DropdownMenuItem onClick={handleBoostPoll} disabled={isBoosting}>
                          <Zap className="w-4 h-4 mr-2 text-hold-muted-foreground" />
                          {isBoosting ? 'Boosting...' : 'Boost Poll (24h)'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleSharePoll}>
                        <Share2 className="w-4 h-4 mr-2 text-primary" />
                        Share Poll
                      </DropdownMenuItem>
                      {canEditDelete && onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(poll)}>
                          <Edit className="w-4 h-4 mr-2 text-primary" />
                          Edit Poll
                        </DropdownMenuItem>
                      )}
                      {canEditDelete && (
                        <DropdownMenuItem onClick={() => onDelete(poll)} className="text-sell-muted-foreground">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Poll
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <p className="text-sm text-subtle font-semibold mt-2 leading-relaxed">
              {poll.title}
            </p>

            {localPollData.image_url && !imageFailed && (
              <div className="mt-3 rounded-lg overflow-hidden border border-border">
                <img
                  src={localPollData.image_url}
                  alt="Poll visual"
                  loading="lazy"
                  // A missing file used to leave a 192px empty frame with the
                  // alt text in it, which both looked broken and threw the row
                  // out of alignment. Drop the figure instead.
                  onError={() => setImageFailed(true)}
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer motion-reduce:transform-none"
                  onClick={() => window.open(localPollData.image_url, '_blank')}
                />
              </div>
            )}

            <div className="flex items-center gap-4 mt-2">
              {poll.confidence_score && (
                <div className="flex items-center gap-1">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < poll.confidence_score ? 'text-hold fill-hold' : 'text-muted-foreground'}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Voting Results */}
            <div className="space-y-3 pt-2">
              {Object.entries(voteData).map(([voteType, data]) => (
                <div key={voteType}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <data.icon className={`w-4 h-4 ${data.color}`} />
                      <span className="font-medium text-subtle">{data.label}</span>
                    </div>
                    <span className="font-semibold text-foreground">{data.count} ({!isNaN(data.percentage) ? data.percentage.toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${data.bgColor} h-2 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${!isNaN(data.percentage) ? data.percentage : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Poll Stats Footer */}
            <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-divider pt-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{totalVotes} votes</span>
              </div>
              {winningVote.type !== 'none' && (
                <span className="font-semibold capitalize">{winningVote.type} {winningVote.percentage.toFixed(0)}%</span>
              )}
              {/* Share button in footer if Dropdown not used (optional, but requested in screenshot to have Share on card) */}
              <Button variant="ghost" size="sm" onClick={handleSharePoll} className="text-muted-foreground hover:text-foreground">
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </Button>
            </div>

            {/* Action Buttons — mt-auto pins just this block to the bottom, so
                the primary control lines up across a row while everything above
                it still flows from the top. Anchoring the whole results block
                instead left a large empty band in the middle of shorter cards. */}
            <div className="mt-auto pt-4">
              {isExpired ? (
                <div className="text-center p-4 bg-surface-2 rounded-lg">
                  <Badge className="bg-muted-foreground text-white text-sm px-3 py-1">
                    <Clock className="w-3 h-3 mr-1" />
                    Poll Expired
                  </Badge>
                  <p className="text-xs text-subtle mt-2">
                    Voting closed on {format(new Date(localPollData.expires_at), 'PPP')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localUserVote ? (
                    // Voted State - Show only the voted option
                    <div className="flex justify-center">
                      {(() => {
                        const optionIndex = localUserVote.option_index;
                        // Determine vote data safely
                        const data = voteData[optionIndex];

                        if (!data) {
                          // Fallback if data is missing (e.g. data mismatch)
                          return (
                            <Button disabled className="w-full bg-muted-foreground text-white">
                              You Voted (Option {optionIndex})
                            </Button>
                          );
                        }

                        const voteType = data.label.toLowerCase();
                        let votedClass = 'bg-primary';
                        if (voteType.includes('buy') || voteType.includes('bullish') || voteType.includes('yes')) {
                          votedClass = 'bg-buy text-buy-foreground hover:bg-buy-soft';
                        } else if (voteType.includes('sell') || voteType.includes('bearish') || voteType.includes('no')) {
                          votedClass = 'bg-sell hover:bg-sell';
                        } else {
                          votedClass = 'bg-hold hover:bg-hold';
                        }

                        return (
                          <Button
                            disabled
                            className={`w-full h-12 text-base rounded-xl font-bold text-white shadow-md opacity-100 ${votedClass}`}
                          >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            You voted: {data.label.toUpperCase()}
                          </Button>
                        );
                      })()}
                    </div>
                  ) : (
                    // Not Voted State - Show all options
                    <div className={`grid gap-2 ${Object.keys(voteData).length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {Object.entries(voteData).map(([optionIndex, data]) => {
                        const voteType = data.label.toLowerCase();
                        let baseColorClass = 'bg-surface-2 text-subtle hover:bg-surface-2';
                        if (voteType.includes('buy') || voteType.includes('bullish') || voteType.includes('yes')) {
                          baseColorClass = 'bg-buy-muted text-buy-muted-foreground hover:bg-buy-muted border border-buy/30';
                        } else if (voteType.includes('sell') || voteType.includes('bearish') || voteType.includes('no')) {
                          baseColorClass = 'bg-sell-muted text-sell-muted-foreground hover:bg-sell-muted border border-sell/30';
                        } else {
                          baseColorClass = 'bg-hold-muted text-hold-muted-foreground hover:bg-hold-muted border border-hold/30';
                        }

                        return (
                          <Button
                            key={optionIndex}
                            onClick={() => handleQuickVote(voteType)}
                            disabled={isVoting}
                            variant="ghost"
                            className={`h-11 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${baseColorClass}`}
                          >
                            {isVoting ? <Zap className="w-4 h-4 animate-spin" /> : <data.icon className="w-4 h-4 mr-2" />}
                            {data.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {userPledge && (
                    <div className="mt-2">
                      <Button disabled className="w-full bg-gradient-to-r from-protocall-deep to-protocall-blue text-white font-semibold">
                        PLEDGED: ₹{userPledge.amount_committed?.toLocaleString() || 'N/A'}
                      </Button>
                    </div>
                  )}

                  {poll.poll_type === 'pledge_poll' && !settingsLoading && !settings.pledgeEnabled && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-surface-2 p-2 rounded-lg mt-2">
                      <AlertCircle className="w-3 h-3" />
                      <span>Pledge system currently disabled by admin.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </TooltipProvider>
    </div>
  );
}
