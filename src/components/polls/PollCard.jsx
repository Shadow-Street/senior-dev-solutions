import React, { useState, useEffect } from "react";
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
    'Buy': { color: 'text-green-600', bgColor: 'bg-green-500' },
    'Sell': { color: 'text-red-600', bgColor: 'bg-red-500' },
    'Hold': { color: 'text-yellow-600', bgColor: 'bg-yellow-500' },
    'Bullish': { color: 'text-green-600', bgColor: 'bg-green-500' },
    'Bearish': { color: 'text-red-600', bgColor: 'bg-red-500' },
    'Neutral': { color: 'text-yellow-600', bgColor: 'bg-yellow-500' },
    'Yes': { color: 'text-green-600', bgColor: 'bg-green-500' },
    'No': { color: 'text-red-600', bgColor: 'bg-red-500' }
  };

  let voteData = {};
  if (pollOptions.length > 0) {
    pollOptions.forEach((option, index) => {
      const voteCount = pollVotes[index] || 0;
      const colors = colorMap[option] || { color: 'text-blue-600', bgColor: 'bg-blue-500' };
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
      <Card className="border-2 border-dashed border-slate-300 bg-slate-100/50 relative p-6">
        <div className="absolute inset-0 bg-slate-200/70 flex items-center justify-center z-10">
          <div className="text-center">
            <Ban className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800">Poll Suspended</h3>
          </div>
        </div>
        <div className="opacity-50 space-y-4">
          <h3 className="font-bold text-slate-700">{poll.stock_symbol}</h3>
          {/* Show grayed out results */}
          <div className="space-y-3">
            {Object.entries(voteData).map(([voteType, data]) => (
              <div key={voteType} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{data.label}</span>
                  <span>{data.count}</span>
                </div>
                <div className="h-2 bg-slate-300 rounded-full w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Math.random() < 0.2 && (
        <AdDisplay
          placement="polls"
          userContext={{ stock_symbol: poll.stock_symbol }}
        />
      )}

      <TooltipProvider>
        <Card className={`transition-all duration-300 border-0 relative group ${isBoosted ? 'ring-2 ring-yellow-400 shadow-xl' : ''
          } ${isPremiumDesign ? "overflow-hidden shadow-lg bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transform hover:-translate-y-1" : "bg-white hover:shadow-lg"} ${isLocked ? 'locked-poll-card' : ''}`}>

          {poll.is_premium && !canAccessPollContent && !isAdmin && (
            <PremiumAccessOverlay
              title="Premium Poll"
              message="Get deeper insights with our expert community analysis. Subscribe to participate."
            />
          )}

          {isBoosted && (
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 opacity-20 animate-pulse z-0"></div>
          )}

          {poll.is_premium && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-indigo-500 opacity-10 rounded-full transform translate-x-16 -translate-y-16 z-0"></div>
          )}

          <div className="relative z-10 p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <CardTitle className="text-lg font-bold text-slate-900 leading-tight">
                    {poll.stock_symbol}
                  </CardTitle>
                  {isBoosted && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-md animate-pulse">
                      <Flame className="w-3 h-3 mr-1" />
                      Boosted
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {poll.is_premium ? (
                  <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-md">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                ) : isAdvisorPoll && (
                  <Badge className="bg-purple-100 text-purple-800 border border-purple-200 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Advisor
                  </Badge>
                )}

                {timeRemaining && !isExpired && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
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
                          <Zap className="w-4 h-4 mr-2 text-yellow-600" />
                          {isBoosting ? 'Boosting...' : 'Boost Poll (24h)'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleSharePoll}>
                        <Share2 className="w-4 h-4 mr-2 text-blue-600" />
                        Share Poll
                      </DropdownMenuItem>
                      {canEditDelete && onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(poll)}>
                          <Edit className="w-4 h-4 mr-2 text-blue-600" />
                          Edit Poll
                        </DropdownMenuItem>
                      )}
                      {canEditDelete && (
                        <DropdownMenuItem onClick={() => onDelete(poll)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Poll
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-700 font-semibold mt-2 leading-relaxed">
              {poll.title}
            </p>

            {localPollData.image_url && (
              <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={localPollData.image_url}
                  alt="Poll visual"
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => window.open(localPollData.image_url, '_blank')}
                />
              </div>
            )}

            <div className="flex items-center gap-4 mt-2">
              {poll.confidence_score && (
                <div className="flex items-center gap-1">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < poll.confidence_score ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
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
                      <span className="font-medium text-slate-700">{data.label}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{data.count} ({!isNaN(data.percentage) ? data.percentage.toFixed(1) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${data.bgColor} h-2 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${!isNaN(data.percentage) ? data.percentage : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Poll Stats Footer */}
            <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{totalVotes} votes</span>
              </div>
              {winningVote.type !== 'none' && (
                <span className="font-semibold capitalize">{winningVote.type} {winningVote.percentage.toFixed(0)}%</span>
              )}
              {/* Share button in footer if Dropdown not used (optional, but requested in screenshot to have Share on card) */}
              <Button variant="ghost" size="sm" onClick={handleSharePoll} className="text-slate-500 hover:text-slate-800">
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="mt-4">
              {isExpired ? (
                <div className="text-center p-4 bg-slate-100 rounded-lg">
                  <Badge className="bg-slate-600 text-white text-sm px-3 py-1">
                    <Clock className="w-3 h-3 mr-1" />
                    Poll Expired
                  </Badge>
                  <p className="text-xs text-slate-600 mt-2">
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
                            <Button disabled className="w-full bg-slate-500 text-white">
                              You Voted (Option {optionIndex})
                            </Button>
                          );
                        }

                        const voteType = data.label.toLowerCase();
                        let votedClass = 'bg-blue-600';
                        if (voteType.includes('buy') || voteType.includes('bullish') || voteType.includes('yes')) {
                          votedClass = 'bg-green-600 hover:bg-green-700';
                        } else if (voteType.includes('sell') || voteType.includes('bearish') || voteType.includes('no')) {
                          votedClass = 'bg-red-600 hover:bg-red-700';
                        } else {
                          votedClass = 'bg-yellow-500 hover:bg-yellow-600';
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
                        let baseColorClass = 'bg-slate-50 text-slate-600 hover:bg-slate-100';
                        if (voteType.includes('buy') || voteType.includes('bullish') || voteType.includes('yes')) {
                          baseColorClass = 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200';
                        } else if (voteType.includes('sell') || voteType.includes('bearish') || voteType.includes('no')) {
                          baseColorClass = 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
                        } else {
                          baseColorClass = 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200';
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
                      <Button disabled className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                        PLEDGED: ₹{userPledge.amount_committed?.toLocaleString() || 'N/A'}
                      </Button>
                    </div>
                  )}

                  {poll.poll_type === 'pledge_poll' && !settingsLoading && !settings.pledgeEnabled && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">
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