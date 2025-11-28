import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Target,
  Crown,
  Shield,
  Lock,
  Star,
  MoreVertical,
  Trash2,
  AlertCircle,
  CheckCircle,
  Ban,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Flame
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdDisplay from '../dashboard/AdDisplay';
import { toast } from 'sonner';
import { User, Subscription, Poll, PollVote } from '@/api/entities';
import { format } from 'date-fns';

export default function PollCard({ poll, user, userVote, onVoteSubmit, onViewDetails, onDelete, isLocked, userPledge }) {
  const { settings, isLoading: settingsLoading } = usePlatformSettings();
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [expanded, setExpanded] = useState(false);
  
  const [localUserVote, setLocalUserVote] = useState(userVote || null);
  const [localPollData, setLocalPollData] = useState(poll);
  const [isVoting, setIsVoting] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  // NEW: Check if poll is currently boosted
  const isBoosted = localPollData.is_boosted && 
                   localPollData.boost_expires_at && 
                   new Date(localPollData.boost_expires_at) > new Date();

  // NEW: Check if poll is expired
  const isExpired = localPollData.expires_at && new Date(localPollData.expires_at) <= new Date();

  // NEW: Calculate time remaining
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

  // Check access for premium polls
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!poll.is_premium || !user || ['admin', 'super_admin'].includes(user.app_role)) {
        setHasAccess(true);
        setIsCheckingAccess(false);
        return;
      }

      try {
        const subs = await Subscription.filter({
          user_id: user.id,
          status: 'active'
        });
        setHasAccess(subs && subs.length > 0);
      } catch (error) {
        console.error('Failed to check subscription access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkUserAccess();
  }, [user, poll.is_premium]);

  // Sync local state when props change
  useEffect(() => {
    setLocalUserVote(userVote);
  }, [userVote]);

  useEffect(() => {
    setLocalPollData(poll);
  }, [poll]);

  const isAdvisorPoll = poll.created_by_admin || poll.created_by_role === 'admin' || poll.created_by_role === 'advisor';
  const isPremiumDesign = poll.is_premium || isAdvisorPoll;
  const isAdmin = user && ['admin', 'super_admin'].includes(user.app_role);
  const canAccessPollContent = isAdmin || (poll.is_premium ? hasAccess : true);

  // Check if user can boost this poll
  const canBoost = user && (
    user.id === poll.created_by || 
    ['admin', 'super_admin'].includes(user.app_role)
  );

  // Calculate percentages based on poll type
  const totalVotes = localPollData.total_votes || 0;
  let voteData = {};

  const voteConfigs = {
    'sentiment': {
      bullish: { icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-500', label: 'Bullish' },
      bearish: { icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-500', label: 'Bearish' },
      neutral: { icon: Minus, color: 'text-yellow-600', bgColor: 'bg-yellow-500', label: 'Neutral' }
    },
    'price_target': {
      yes: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-500', label: 'Yes' },
      no: { icon: Ban, color: 'text-red-600', bgColor: 'bg-red-500', label: 'No' }
    },
    'buy_sell_hold': {
      buy: { icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-500', label: 'Buy' },
      sell: { icon: TrendingDown, color: 'text-red-600', bgColor: 'bg-red-500', label: 'Sell' },
      hold: { icon: Minus, color: 'text-yellow-600', bgColor: 'bg-yellow-500', label: 'Hold' }
    }
  };

  const currentConfig = voteConfigs[localPollData.poll_type] || voteConfigs['buy_sell_hold'];
  const voteOrder = Object.keys(currentConfig);

  voteData = voteOrder.reduce((acc, key) => {
    const voteCount = localPollData[`${key}_votes`] || 0;
    acc[key] = {
      ...currentConfig[key],
      count: voteCount,
      percentage: totalVotes > 0 ? (voteCount / totalVotes * 100) : 0,
    };
    return acc;
  }, {});

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

  const getUserVoteBadgeStyle = (vote) => {
    switch (vote) {
      case 'buy':
      case 'bullish':
      case 'yes':
        return 'bg-green-600 text-white';
      case 'sell':
      case 'bearish':
      case 'no':
        return 'bg-red-600 text-white';
      case 'hold':
      case 'neutral':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Handle poll boost
  const handleBoostPoll = async () => {
    if (!canBoost) {
      toast.error("You don't have permission to boost this poll");
      return;
    }

    setIsBoosting(true);

    try {
      // Boost for 24 hours
      const boostExpiry = new Date();
      boostExpiry.setHours(boostExpiry.getHours() + 24);

      await Poll.update(poll.id, {
        is_boosted: true,
        boost_expires_at: boostExpiry.toISOString(),
        boosted_by: user.id
      });

      // Update local state
      setLocalPollData({
        ...localPollData,
        is_boosted: true,
        boost_expires_at: boostExpiry.toISOString(),
        boosted_by: user.id
      });

      toast.success('Poll boosted for 24 hours! It will appear at the top.');
    } catch (error) {
      console.error('Error boosting poll:', error);
      toast.error('Failed to boost poll');
    } finally {
      setIsBoosting(false);
    }
  };

  // Instant vote handler with optimistic updates
  const handleQuickVote = async (vote) => {
    if (localUserVote) {
      toast.info("You have already voted on this poll");
      return;
    }

    if (!user) {
      toast.error("Please log in to vote");
      return;
    }

    setIsVoting(true);

    const previousPollData = { ...localPollData };
    const previousUserVote = localUserVote;

    const voteField = `${vote}_votes`;
    const newPollData = {
      ...localPollData,
      [voteField]: (localPollData[voteField] || 0) + 1,
      total_votes: (localPollData.total_votes || 0) + 1
    };

    setLocalPollData(newPollData);
    setLocalUserVote(vote);

    try {
      await PollVote.create({
        poll_id: poll.id,
        user_id: user.id,
        vote
      });

      await Poll.update(poll.id, {
        [voteField]: newPollData[voteField],
        total_votes: newPollData.total_votes
      });

      toast.success("Your vote has been recorded!");

      if (onVoteSubmit) {
        onVoteSubmit(vote).catch(() => {});
      }

    } catch (error) {
      console.error('Quick vote error:', error);
      toast.error('Failed to submit vote');

      setLocalPollData(previousPollData);
      setLocalUserVote(previousUserVote);
    } finally {
      setIsVoting(false);
    }
  };

  // Premium access check
  if (!isAdmin && !isCheckingAccess && !canAccessPollContent && poll.is_premium) {
    return (
      <Card className="border-2 border-dashed border-purple-200 bg-purple-50/30 relative">
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="text-center p-6">
            <Lock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-900">Premium Poll</h3>
            <p className="text-sm text-purple-700 mb-3">Subscribe to access premium content</p>
            <Link to={createPageUrl("Subscription")}>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </div>
        <div className="p-6 opacity-30">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-8 bg-slate-100 rounded"></div>
            <div className="h-8 bg-slate-100 rounded"></div>
            <div className="h-8 bg-slate-100 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  // Inactive/Suspended Card
  if (!poll.is_active) {
    return (
      <Card className="border-2 border-dashed border-slate-300 bg-slate-100/50 relative">
        <div className="absolute inset-0 bg-slate-200/70 flex items-center justify-center z-10">
          <div className="text-center p-6">
            <Ban className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800">Poll Suspended</h3>
            <p className="text-sm text-slate-600">This poll is currently not active.</p>
          </div>
        </div>
        <div className="p-6 opacity-50 space-y-4">
          <h3 className="font-bold text-slate-700">{poll.stock_symbol}</h3>
          <div className="space-y-3">
            {Object.entries(voteData).map(([voteType, data]) => (
              <div key={voteType} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <data.icon className={`w-4 h-4 ${data.color}`} />
                    <span className="capitalize">{data.label}</span>
                  </div>
                  <span className="font-semibold">{data.count} ({data.percentage.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-slate-300 rounded-full h-2">
                  <div className={`${data.bgColor}`} style={{ width: `${data.percentage}%`, height: '100%', borderRadius: '9999px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Main Active Card
  return (
    <div className="space-y-4">
      {Math.random() < 0.2 && (
        <AdDisplay
          placement="polls"
          userContext={{
            stock_symbol: poll.stock_symbol
          }}
        />
      )}

      <TooltipProvider>
        <Card className={`transition-all duration-300 border-0 relative group ${
          isBoosted ? 'ring-2 ring-yellow-400 shadow-xl' : ''
        } ${isPremiumDesign ? "overflow-hidden shadow-lg bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transform hover:-translate-y-1" : "bg-white hover:shadow-lg"} ${isLocked ? 'locked-poll-card' : ''}`}>
          
          {/* Boosted Glow Effect */}
          {isBoosted && (
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 opacity-20 animate-pulse z-0"></div>
          )}

          {poll.is_premium && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-indigo-500 opacity-10 rounded-full transform translate-x-16 -translate-y-16 z-0"></div>
          )}

          <div className="relative z-10">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div>
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

                    {(canBoost || isAdmin) && (
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
                          {isAdmin && (
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
                      <span className="font-semibold text-slate-800">{data.count} ({data.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${data.bgColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${data.percentage}%` }}></div>
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
              </div>

              {/* Action/Status Section */}
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
                ) : !localUserVote ? (
                  <div className={`grid gap-2 ${voteOrder.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {Object.entries(voteData).map(([voteType, data]) => (
                      <TooltipProvider key={voteType}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => handleQuickVote(voteType)}
                              disabled={isVoting}
                              className={`h-9 p-2 px-3 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center gap-1.5 border-none ${
                                (voteType === 'buy' || voteType === 'bullish' || voteType === 'yes') ? 'bg-green-100 text-green-800 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white' :
                                (voteType === 'sell' || voteType === 'bearish' || voteType === 'no') ? 'bg-red-100 text-red-800 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white' :
                                'bg-yellow-100 text-yellow-800 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white'
                              }`}
                            >
                              <data.icon className="w-4 h-4" />
                              {data.label}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to vote '{data.label}'</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="w-full text-center">
                      <Badge className={`${getUserVoteBadgeStyle(localUserVote)} text-sm px-3 py-1 rounded-full font-semibold hover:bg-black hover:text-white hover:shadow-md transition-all duration-200 cursor-default`}>
                        You voted: {localUserVote ? localUserVote.toUpperCase() : ''}
                      </Badge>
                    </div>
                  </div>
                )}

                {userPledge && (
                  <div className="mt-2">
                    <Button
                      disabled
                      className="w-full py-2 rounded-xl px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                    >
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
            </div>
          </div>
        </Card>
      </TooltipProvider>
    </div>
  );
}