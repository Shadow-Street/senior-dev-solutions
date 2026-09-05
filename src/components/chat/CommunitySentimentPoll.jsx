// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { Poll, PollVote, Pledge } from '@/lib/apiClient';
// import { Card, CardContent } from '@/components/ui/card';
// import { toast } from 'sonner';
// import PollCard from '../polls/PollCard';
// import { Skeleton } from '@/components/ui/skeleton';

// export default function CommunitySentimentPoll({ stockSymbol, user, refreshTrigger = 0 }) {
//   console.log("CommunitySentimentPoll: Refresh triggered", { stockSymbol, refreshTrigger, user }); // Debug log
//   const [poll, setPoll] = useState(null);
//   const [userVote, setUserVote] = useState(null);
//   const [userPledge, setUserPledge] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isVoting, setIsVoting] = useState(false);
//   const isMountedRef = useRef(true);

//   const fetchPollAndUserData = useCallback(async () => {
//     if (!isMountedRef.current) return;

//     if (!stockSymbol) {
//       if (isMountedRef.current) {
//         setIsLoading(false);
//         setPoll(null);
//       }
//       return;
//     }

//     if (isMountedRef.current) setIsLoading(true);

//     let fetchedPoll = null;

//     try {
//       console.log("Fetching polls for stock:", stockSymbol);

//       const polls = await Poll.filter({
//         stock_symbol: stockSymbol.toUpperCase(),
//         is_active: true
//       }, '-created_date', 10);

//       console.log("Polls found:", polls);

//       if (!isMountedRef.current) return;

//       if (polls.length > 0) {
//         fetchedPoll = polls[0];
//         console.log("Active poll selected:", fetchedPoll);
//         setPoll(fetchedPoll);
//       } else {
//         console.log("No active polls found for stock:", stockSymbol);
//         setPoll(null);
//       }
//     } catch (error) {
//       console.error("Error fetching polls:", error);
//       setPoll(null);
//     }

//     // === User-specific data (only if poll exists and user logged in) ===
//     if (fetchedPoll && user) {
//       // Fetch user vote - treat 404 as "no vote yet"
//       try {
//         const userVotes = await PollVote.filter({
//           poll_id: fetchedPoll.id,
//           user_id: user.id
//         });
//         console.log("User votes:", userVotes);
//         setUserVote(userVotes.length > 0 ? userVotes[0] : null);
//       } catch (error) {
//         if (error.response?.status === 404) {
//           console.log("No vote found for user (normal)");
//           setUserVote(null);
//         } else {
//           console.error("Unexpected error fetching user vote:", error);
//           // Don't hide the poll - just no vote data
//           setUserVote(null);
//         }
//       }

//       // Fetch pledge only if needed
//       if (fetchedPoll.poll_type === 'pledge_poll') {
//         try {
//           const userPledges = await Pledge.filter({
//             poll_id: fetchedPoll.id,
//             user_id: user.id
//           });
//           setUserPledge(userPledges.length > 0 ? userPledges[0] : null);
//         } catch (error) {
//           if (error.response?.status === 404) {
//             setUserPledge(null);
//           } else {
//             console.error("Unexpected error fetching pledge:", error);
//             setUserPledge(null);
//           }
//         }
//       } else {
//         setUserPledge(null);
//       }
//     } else {
//       setUserVote(null);
//       setUserPledge(null);
//     }

//     if (isMountedRef.current) {
//       setIsLoading(false);
//     }
//   }, [stockSymbol, user]);

//   // Effect to fetch poll data initially and when dependencies change
//   useEffect(() => {
//     isMountedRef.current = true;
//     console.log("CommunitySentimentPoll: Refresh triggered", { stockSymbol, refreshTrigger }); // Debug log
//     fetchPollAndUserData();

//     return () => {
//       isMountedRef.current = false;
//     };
//   }, [fetchPollAndUserData, refreshTrigger]); // refreshTrigger as dependency

//   const handleVote = async (vote) => {
//     if (!user) {
//       toast.error("Please log in to vote!");
//       return;
//     }

//     if (userVote) {
//       toast.info("You've already voted!");
//       return;
//     }

//     if (!poll) {
//       toast.error("Poll not found or not active.");
//       return;
//     }

//     if (isVoting) return;
//     setIsVoting(true);

//     try {
//       const currentPoll = poll;

//       // Prepare atomic update for vote counts
//       const voteFieldUpdates = {
//         total_votes: (currentPoll.total_votes || 0) + 1
//       };

//       // Update appropriate vote count based on poll type
//       if (currentPoll.poll_type === 'sentiment') {
//         if (vote === 'bullish') voteFieldUpdates.bullish_votes = (currentPoll.bullish_votes || 0) + 1;
//         else if (vote === 'bearish') voteFieldUpdates.bearish_votes = (currentPoll.bearish_votes || 0) + 1;
//         else if (vote === 'neutral') voteFieldUpdates.neutral_votes = (currentPoll.neutral_votes || 0) + 1;
//       } else if (currentPoll.poll_type === 'price_target') {
//         if (vote === 'yes') voteFieldUpdates.yes_votes = (currentPoll.yes_votes || 0) + 1;
//         else if (vote === 'no') voteFieldUpdates.no_votes = (currentPoll.no_votes || 0) + 1;
//       } else { // buy_sell_hold or pledge_poll
//         if (vote === 'buy') voteFieldUpdates.buy_votes = (currentPoll.buy_votes || 0) + 1;
//         else if (vote === 'sell') voteFieldUpdates.sell_votes = (currentPoll.sell_votes || 0) + 1;
//         else if (vote === 'hold') voteFieldUpdates.hold_votes = (currentPoll.hold_votes || 0) + 1;
//       }

//       console.log("Submitting vote:", { vote, voteFieldUpdates }); // Debug log

//       // ATOMIC UPDATE: Create vote and update poll counts simultaneously
//       await Promise.all([
//         PollVote.create({ poll_id: currentPoll.id, user_id: user.id, vote }),
//         Poll.update(currentPoll.id, voteFieldUpdates)
//       ]);

//       toast.success(`Voted ${vote}!`);

//       // Reload polls to get authoritative state from database
//       await fetchPollAndUserData();

//     } catch (error) {
//       console.error("Error voting:", error);
//       toast.error("Failed to record vote. Please try again.");
//       await fetchPollAndUserData();
//     } finally {
//       setIsVoting(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <Card className="shadow-lg border-0 bg-white">
//         <CardContent className="p-4">
//           <Skeleton className="h-40 w-full" />
//         </CardContent>
//       </Card>
//     );
//   }

//   if (!poll) {
//     console.log("No poll found for stock:", stockSymbol);
//     return null;
//   }

//   console.log("poll", poll);
//   console.log("user", user);
//   console.log("userVote", userVote);
//   console.log("userPledge", userPledge);
//   return (
//     <PollCard
//       poll={poll}
//       user={user}
//       userVote={userVote?.vote}
//       onVoteSubmit={handleVote}
//       onViewDetails={() => { }}
//       onDelete={null}
//       userPledge={userPledge}
//     />
//   );
// }

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Poll, PollVote, Pledge } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import PollCard from '../polls/PollCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommunitySentimentPoll({ stockSymbol, user, refreshTrigger = 0 }) {
  console.log("CommunitySentimentPoll: Render", { stockSymbol, refreshTrigger, user });

  const [poll, setPoll] = useState(null);
  const [userVote, setUserVote] = useState(null); // Full PollVote record or null
  const [userPledge, setUserPledge] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchPollAndUserData = useCallback(async () => {
    if (!isMountedRef.current) return;

    if (!stockSymbol) {
      setIsLoading(false);
      setPoll(null);
      return;
    }

    setIsLoading(true);

    let fetchedPoll = null;

    try {
      const polls = await Poll.filter({
        stock_symbol: stockSymbol.toUpperCase(),
        is_active: true
      }, '-created_date', 10);

      console.log("Fetched polls:", polls);

      if (!isMountedRef.current) return;

      if (polls.length > 0) {
        fetchedPoll = polls[0];
        setPoll(fetchedPoll);
      } else {
        setPoll(null);
      }
    } catch (error) {
      console.error("Error fetching poll:", error);
      setPoll(null);
    }

    console.log("fetchedPoll", fetchedPoll, user);
 
    // Fetch user-specific data only if we have a poll and a logged-in user
    if (fetchedPoll && user) {
      console.log("Fetching user-specific data for poll:", fetchedPoll.id);
      try {
        const userVotes = await PollVote.filter({
          poll_id: fetchedPoll.id,
          user_id: user.id
        });

        console.log("Fetched user vote records:", userVotes);
        setUserVote(userVotes.length > 0 ? userVotes[0] : null);
      } catch (error) {
        console.log("Error fetching user vote:", error);
        if (error.response?.status === 404) {
          console.log("No existing vote (expected for new vote)");
          setUserVote(null);
        } else {
          console.error("Error fetching user vote:", error);
          setUserVote(null);
        }
      }

      // Pledge only for pledge_poll type
      if (fetchedPoll.poll_type === 'pledge_poll') {
        try {
          const pledges = await Pledge.filter({
            poll_id: fetchedPoll.id,
            user_id: user.id
          });
          setUserPledge(pledges.length > 0 ? pledges[0] : null);
        } catch (error) {
          if (error.response?.status === 404) {
            setUserPledge(null);
          } else {
            console.error("Error fetching pledge:", error);
            setUserPledge(null);
          }
        }
      } else {
        setUserPledge(null);
      }
    } else {
      setUserVote(null);
      setUserPledge(null);
    }

    setIsLoading(false);
  }, [stockSymbol, user]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPollAndUserData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPollAndUserData, refreshTrigger]);

  // Called by PollCard after a successful vote cast via /polls/votes/cast
  const handleVoteSuccess = useCallback(async () => {
    console.log("Vote successful – refetching fresh poll & user vote data");
    await fetchPollAndUserData();
  }, [fetchPollAndUserData]);

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-4">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!poll) {
    console.log("No active poll for:", stockSymbol);
    return null;
  }

  console.log("Rendering PollCard with:", { poll, userVote: userVote ? 'voted' : 'not voted' });

  return (
    <PollCard
      poll={poll}
      user={user}
      userVote={userVote} // ← Full vote object (has option_index) or null
      onVoteSubmit={handleVoteSuccess} // ← Only refetch after successful vote
      onViewDetails={() => {}}
      onDelete={null}
      userPledge={userPledge}
    />
  );
}