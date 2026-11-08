import { useState, useEffect, useMemo } from "react";
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
import { usePlatformSettings } from "../hooks/usePlatformSettings";
import { useSubscription } from "@/components/hooks/useSubscription";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdDisplay from '../dashboard/AdDisplay';
import { toast } from 'sonner';
import { Poll } from '@/api/entities';
import apiClient from '@/lib/apiClient';
import { format } from 'date-fns';
import PremiumAccessOverlay from '../common/PremiumAccessOverlay';
import { getPollTally, withVoteApplied } from '@/lib/pollVotes';
import { pollShowsAd } from './pollAd';
import { useAdsEnabled } from '@/components/hooks/useAdsEnabled';

// Per-tone styling for result bars and the option buttons. Tones come from the
// option label (see optionTone), so Buy / Bullish / Yes share a look.
const TONE_STYLES = {
  positive: {
    icon: TrendingUp,
    text: 'text-buy-muted-foreground',
    bar: 'bg-buy',
    idle: 'bg-buy-muted text-buy-muted-foreground border border-buy/30 hover:bg-buy-muted hover:border-buy',
    voted: 'bg-buy text-buy-foreground hover:bg-buy',
  },
  negative: {
    icon: TrendingDown,
    text: 'text-sell-muted-foreground',
    bar: 'bg-sell',
    idle: 'bg-sell-muted text-sell-muted-foreground border border-sell/30 hover:bg-sell-muted hover:border-sell',
    voted: 'bg-sell text-sell-foreground hover:bg-sell',
  },
  neutral: {
    icon: Minus,
    text: 'text-hold-muted-foreground',
    bar: 'bg-hold',
    idle: 'bg-hold-muted text-hold-muted-foreground border border-hold/30 hover:bg-hold-muted hover:border-hold',
    voted: 'bg-hold text-hold-foreground hover:bg-hold',
  },
  other: {
    icon: Star,
    text: 'text-primary',
    bar: 'bg-primary',
    idle: 'bg-surface-2 text-foreground border border-border hover:bg-surface-2 hover:border-primary/40',
    voted: 'bg-primary text-primary-foreground hover:bg-primary',
  },
};

export default function PollCard({ poll, user, userVote, onVoteSubmit, onDelete, onEdit, isLocked, userPledge, onShare, withAd = true }) {
  const { settings, isLoading: settingsLoading } = usePlatformSettings();
  const subscriptionContext = useSubscription();
  // A poll image that 404s should disappear, not leave an empty frame.
  const [imageFailed, setImageFailed] = useState(false);
  // Pages that lay polls out in a grid render the sponsored card as its own
  // grid item (withAd = false); embedded uses (chat) keep it above the poll.
  const adsEnabled = useAdsEnabled();
  const showAd = withAd && pollShowsAd(poll?.id, adsEnabled);

  const [hasAccess, setHasAccess] = useState(false);

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

  // Premium access check using subscription features
  useEffect(() => {
    if (!poll.is_premium || !user) {
      setHasAccess(!poll.is_premium);
      return;
    }

    // Admin/SuperAdmin bypass
    if (['admin', 'super_admin'].includes(user.app_role)) {
      setHasAccess(true);
      return;
    }

    const canViewPremiumPolls = subscriptionContext?.hasFeatureAccess?.('premium_polls');
    setHasAccess(!!canViewPremiumPolls);
  }, [user, poll.is_premium, subscriptionContext]);

  const isAdvisorPoll = poll.created_by_admin || poll.created_by_role === 'admin' || poll.created_by_role === 'advisor';
  const isAdmin = user && ['admin', 'super_admin'].includes(user.app_role);
  const isCreator = user && user.id === poll.created_by;
  const canAccessPollContent = isAdmin || (poll.is_premium ? hasAccess : true);
  const canBoost = user && (isCreator || isAdmin);
  const canEditDelete = isCreator || isAdmin;

  // One tally for the whole card, so the bars, the vote total and the leading
  // option can never disagree (see src/lib/pollVotes.js).
  const tally = useMemo(() => getPollTally(localPollData), [localPollData]);
  const totalVotes = tally.total;
  const winningVote = tally.leader;

  const toneOf = (option) => TONE_STYLES[option.tone] || TONE_STYLES.other;

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

  // optionIndex is the position in poll.options - the same index the server
  // stores - so polls whose options are not in Buy/Sell/Hold order still
  // record the vote that was clicked.
  const handleQuickVote = async (optionIndex) => {
    if (!user) {
      toast.error("Please log in to vote");
      return;
    }

    if (isExpired) {
      toast.error("This poll has expired");
      return;
    }

    setIsVoting(true);

    const previousPollData = localPollData;
    const previousUserVote = localUserVote;

    // Optimistic update
    setLocalUserVote({
      poll_id: poll.id,
      user_id: user.id,
      option_index: optionIndex,
    });
    setLocalPollData(withVoteApplied(localPollData, optionIndex));

    try {
      const response = await apiClient.post('/polls/votes/cast', {
        poll_id: poll.id,
        option_index: optionIndex
      });

      toast.success(response.data.message || "Your vote has been recorded!");

      const updatedPoll = await Poll.get(poll.id);
      if (updatedPoll) {
        setLocalPollData(updatedPoll);
      }

      try {
        onVoteSubmit?.(response.data.vote);
      } catch (callbackError) {
        console.error('onVoteSubmit failed:', callbackError);
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

  if (!poll.is_active) {
    return (
      <Card className="relative flex h-full flex-col rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 shadow-sm">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-border/70">
          <div className="text-center">
            <Ban className="mx-auto mb-2 h-8 w-8 text-subtle" />
            <h3 className="font-semibold text-foreground">Poll Suspended</h3>
          </div>
        </div>
        <div className="space-y-4 opacity-50">
          <h3 className="text-xl font-bold text-subtle">{poll.stock_symbol}</h3>
          {/* Show grayed out results */}
          <div className="space-y-3">
            {tally.options.map((option) => (
              <div key={option.index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{option.label}</span>
                  <span>{option.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-border"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Same button shape as "Join Conversation" on the chat room cards.
  const actionButton = 'h-10 rounded-xl font-semibold shadow-sm transition-all duration-200 hover:shadow-md';

  const renderActions = () => {
    if (isExpired) {
      return (
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <Badge className="bg-muted-foreground px-3 py-1 text-sm text-white">
            <Clock className="mr-1 h-3 w-3" />
            Poll Expired
          </Badge>
          <p className="mt-2 text-xs text-subtle">
            Voting closed on {format(new Date(localPollData.expires_at), 'PPP')}
          </p>
        </div>
      );
    }

    if (localUserVote) {
      const voted = tally.options[localUserVote.option_index];
      if (!voted) {
        return (
          <Button disabled className={`w-full bg-muted-foreground text-white disabled:opacity-100 ${actionButton}`}>
            You voted (option {Number(localUserVote.option_index) + 1})
          </Button>
        );
      }
      return (
        <Button
          disabled
          className={`w-full border-0 disabled:opacity-100 ${actionButton} ${toneOf(voted).voted}`}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          You voted: {voted.label}
        </Button>
      );
    }

    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(tally.options.length, 1), 3)}, minmax(0, 1fr))` }}
      >
        {tally.options.map((option) => {
          const style = toneOf(option);
          const OptionIcon = style.icon;
          // Icon above the label: three side-by-side buttons in a two-column
          // grid leave ~75px each, which truncated "Bullish" to "Bulli...".
          return (
            <Button
              key={option.index}
              onClick={() => handleQuickVote(option.index)}
              disabled={isVoting}
              variant="ghost"
              className={`${actionButton} h-auto min-h-10 flex-col gap-0.5 px-1.5 py-1.5 text-xs leading-tight ${style.idle}`}
            >
              {isVoting ? <Zap className="h-4 w-4 animate-spin" /> : <OptionIcon className="h-4 w-4 shrink-0" />}
              <span className="max-w-full truncate">{option.label}</span>
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    // The root fills its grid cell; the Card inside takes whatever height the
    // cell has, and the action block is pinned to the bottom (mt-auto), so
    // cards in a row share a height and their buttons line up.
    <div className="flex h-full flex-col gap-4">
      {showAd && (
        <AdDisplay
          placement="polls"
          userContext={{ stock_symbol: poll.stock_symbol }}
        />
      )}

      <TooltipProvider>
        {/* Matches the chat room cards: white, rounded-2xl, subtle border and
            shadow, lift on hover. Boosted / premium are small badges only. */}
        <Card className={`group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm
                          transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20
                          motion-reduce:transform-none motion-reduce:transition-none ${isLocked ? 'locked-poll-card' : ''}`}>

          {poll.is_premium && !canAccessPollContent && !isAdmin && (
            <PremiumAccessOverlay
              title="Premium Poll"
              message="Get deeper insights with our expert community analysis. Subscribe to participate."
            />
          )}

          {poll.is_premium && (
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 transform rounded-full bg-gradient-to-br from-protocall-grape to-protocall-blue opacity-10"></div>
          )}

          <div className="relative z-10 flex flex-1 flex-col gap-4 p-6">
            {/* Badges (omitted when there are none, so titles line up) */}
            {(poll.is_premium || isAdvisorPoll || isBoosted || (timeRemaining && !isExpired)) && (
            <div className="flex flex-wrap items-center gap-2 pr-9">
              {poll.is_premium ? (
                <Badge className="border-0 bg-primary text-white hover:bg-primary">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              ) : isAdvisorPoll && (
                <Badge className="border border-protocall-premium-light bg-premium-muted text-xs text-protocall-premium-text hover:bg-premium-muted">
                  <Shield className="mr-1 h-3 w-3" />
                  Advisor
                </Badge>
              )}
              {isBoosted && (
                <Badge className="border-0 bg-hold-muted text-hold-muted-foreground hover:bg-hold-muted">
                  <Flame className="mr-1 h-3 w-3" />
                  Boosted
                </Badge>
              )}
              {timeRemaining && !isExpired && (
                <Badge variant="outline" className="border-hold/30 bg-hold-muted text-xs text-hold-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {timeRemaining}
                </Badge>
              )}
            </div>
            )}

            {(canEditDelete || canBoost) && (
              <div className="absolute right-4 top-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Poll options for ${poll.stock_symbol || 'poll'}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canBoost && !isBoosted && (
                      <DropdownMenuItem onClick={handleBoostPoll} disabled={isBoosting}>
                        <Zap className="mr-2 h-4 w-4 text-hold-muted-foreground" />
                        {isBoosting ? 'Boosting...' : 'Boost Poll (24h)'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSharePoll}>
                      <Share2 className="mr-2 h-4 w-4 text-primary" />
                      Share Poll
                    </DropdownMenuItem>
                    {canEditDelete && onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(poll)}>
                        <Edit className="mr-2 h-4 w-4 text-primary" />
                        Edit Poll
                      </DropdownMenuItem>
                    )}
                    {canEditDelete && (
                      <DropdownMenuItem onClick={() => onDelete(poll)} className="text-sell-muted-foreground">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Poll
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Title block */}
            <div>
              <CardTitle className="mb-1 line-clamp-1 text-xl font-bold leading-tight text-foreground">
                {poll.stock_symbol}
              </CardTitle>
              <p className="line-clamp-3 text-sm leading-relaxed text-subtle">
                {poll.title}
              </p>
            </div>

            {localPollData.image_url && !imageFailed && (
              <button
                type="button"
                aria-label={`Open the ${poll.stock_symbol || 'poll'} image in a new tab`}
                onClick={() => window.open(localPollData.image_url, '_blank', 'noopener,noreferrer')}
                className="overflow-hidden rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={localPollData.image_url}
                  alt=""
                  loading="lazy"
                  // A missing file used to leave a 192px empty frame, which
                  // looked broken and threw the row out of alignment.
                  onError={() => setImageFailed(true)}
                  className="h-40 w-full object-cover"
                />
              </button>
            )}

            {poll.confidence_score && (
              <div className="flex items-center gap-1" role="img" aria-label={`Confidence ${poll.confidence_score} out of 5`}>
                {Array(5).fill(0).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < poll.confidence_score ? 'fill-hold text-hold' : 'text-muted-foreground'}`} />
                ))}
              </div>
            )}

            {/* Voting results */}
            <div className="space-y-3">
              {tally.options.map((option) => {
                const style = toneOf(option);
                const OptionIcon = style.icon;
                return (
                  <div key={option.index}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <OptionIcon className={`h-4 w-4 ${style.text}`} />
                        <span className="font-medium text-subtle">{option.label}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-foreground">{option.count} ({option.rounded}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`${style.bar} h-2 rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${option.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
              </div>
              {winningVote && (
                <span className="font-semibold">
                  {winningVote.tie ? 'Tied' : winningVote.label} {winningVote.rounded}%
                </span>
              )}
            </div>

            {/* Actions, pinned to the bottom of the card. */}
            <div className="mt-auto flex flex-col gap-2 border-t border-divider pt-4">
              {renderActions()}

              {userPledge && (
                <Button disabled className={`w-full bg-gradient-to-r from-protocall-deep to-protocall-blue text-white disabled:opacity-100 ${actionButton}`}>
                  PLEDGED: ₹{userPledge.amount_committed?.toLocaleString() || 'N/A'}
                </Button>
              )}

              {poll.poll_type === 'pledge_poll' && !settingsLoading && !settings.pledgeEnabled && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-surface-2 p-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span>Pledge system currently disabled by admin.</span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleSharePoll}
                className="h-10 w-full rounded-xl border-border font-medium text-subtle hover:bg-surface-2 hover:text-foreground"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    </div>
  );
}
