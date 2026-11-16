import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, Eye, Users, Vote, PackageOpen, Crown, Sparkles } from 'lucide-react';
import { rankPolls, pollTitle, STATUS_META } from './pollAdminModel';

const TONE_BAR = { positive: 'bg-buy', negative: 'bg-sell', neutral: 'bg-hold', other: 'bg-primary' };

function renderOptionBar(option) {
  return (
    <div key={option.index}>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-foreground truncate pr-2">{option.label}</span>
        <span className="text-muted-foreground tabular-nums">{option.count} ({option.rounded}%)</span>
      </div>
      <div className="w-full bg-border rounded-full h-1.5" role="presentation">
        <div className={`${TONE_BAR[option.tone]} h-1.5 rounded-full`} style={{ width: `${option.percentage}%` }} />
      </div>
    </div>
  );
}

/**
 * Top Performing Polls. Cards are built from the analytics response, whose
 * counts are limited to the selected time range and reconciled from PollVote
 * rows; percentages come from getPollTally, as on member poll cards.
 */
export default function TopPollsWidget({ polls = [], isLoading, error, onRetry, range, onRangeChange, onViewDetails }) {
  const [metric, setMetric] = useState('votes');
  const top = useMemo(() => rankPolls(polls, metric, 3), [polls, metric]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-5 h-5 text-primary" aria-hidden="true" />
          Top Performing Polls
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[150px]" aria-label="Rank polls by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">By Votes</SelectItem>
              <SelectItem value="voters">By Unique Voters</SelectItem>
              <SelectItem value="consensus">By Consensus</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger className="w-[120px]" aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading top polls">
            {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-xl bg-surface-2 animate-pulse" />)}
          </div>
        ) : error ? (
          <div role="alert" className="py-10 text-center text-sm text-sell-muted-foreground space-y-3">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
          </div>
        ) : top.length === 0 ? (
          <div className="text-center py-12">
            <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No poll activity in this period</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a longer time range.</p>
          </div>
        ) : (
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top.map(({ poll, tally }, rank) => (
              <li key={poll.id} className="bg-surface-2 border border-border rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground">
                    <span className="text-primary mr-1">#{rank + 1}</span>
                    {pollTitle(poll)}
                  </p>
                  <Badge variant="outline" className={STATUS_META[poll.admin_status]?.className}>
                    {STATUS_META[poll.admin_status]?.label || 'Active'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                  {poll.stock_symbol && <Badge variant="secondary">{poll.stock_symbol}</Badge>}
                  {poll.is_premium && <Badge className="bg-premium-muted text-primary border-0"><Crown className="w-3 h-3 mr-1" aria-hidden="true" />Premium</Badge>}
                  {poll.is_featured && <Badge className="bg-primary/10 text-primary border-0"><Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />Featured</Badge>}
                </div>
                <div className="space-y-2.5 mb-4 flex-1">
                  {tally.options.map(renderOptionBar)}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
                  <div className="flex items-center gap-4 text-subtle">
                    <span className="flex items-center gap-1.5" title="Votes"><Vote className="w-4 h-4" aria-hidden="true" />{tally.total}<span className="sr-only"> votes</span></span>
                    <span className="flex items-center gap-1.5" title="Unique voters"><Users className="w-4 h-4" aria-hidden="true" />{tally.uniqueVoters}<span className="sr-only"> unique voters</span></span>
                    {tally.leader && <span className="text-xs">{tally.leader.tie ? 'Tied' : `${tally.leader.label} ${tally.leader.rounded}%`}</span>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onViewDetails(poll)} aria-label={`View details for ${pollTitle(poll)}`}>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
