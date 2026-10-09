import React, { useState, useEffect } from 'react';
import { Poll } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart3, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdvisorRecommendedPolls({ stockSymbol, user }) {
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPolls = async () => {
      try {
        // Fetch active polls related to the current stock or general polls
        let stockPolls = [];
        let generalPolls = [];
        
        if (stockSymbol) {
          stockPolls = await Poll.filter({
            stock_symbol: stockSymbol,
            is_active: true,
          }, '-created_date', 2);
        }
        
        // Get some general active polls if not enough stock-specific ones
        generalPolls = await Poll.filter({
          is_active: true,
        }, '-created_date', 3);
        
        if (isMounted) {
          // Combine and deduplicate
          const combined = [...stockPolls, ...generalPolls];
          const uniquePolls = Array.from(new Set(combined.map(p => p.id)))
            .map(id => combined.find(p => p.id === id));
          
          setPolls(uniquePolls.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching community polls:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPolls();

    return () => {
      isMounted = false;
    };
  }, [stockSymbol]);

  const getWinningVote = (poll) => {
    const votes = [
      { type: 'Buy', count: poll.buy_votes || 0, icon: <TrendingUp className="w-3 h-3 text-buy-muted-foreground" /> },
      { type: 'Sell', count: poll.sell_votes || 0, icon: <TrendingDown className="w-3 h-3 text-sell-muted-foreground" /> },
      { type: 'Hold', count: poll.hold_votes || 0, icon: <Minus className="w-3 h-3 text-hold-muted-foreground" /> },
    ];
    
    if (poll.total_votes === 0) {
      return { type: 'No votes', icon: <BarChart3 className="w-3 h-3 text-muted-foreground" /> };
    }

    return votes.reduce((a, b) => a.count > b.count ? a : b);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (polls.length === 0) {
    return null; // Don't render the card if there are no polls
  }

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-surface-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            Community Polls
          </CardTitle>
          <Link to={createPageUrl("Polls")}>
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        {polls.map((poll) => (
          <Link to={createPageUrl(`Polls?poll_id=${poll.id}`)} key={poll.id} className="block p-3 rounded-lg hover:bg-surface-2 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{poll.title}</p>
                <Badge variant="outline" className="text-xs font-semibold mt-1">{poll.stock_symbol}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {getWinningVote(poll).icon}
                <span>{getWinningVote(poll).type}</span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}