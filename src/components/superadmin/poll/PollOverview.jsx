import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Users, Percent, Vote } from 'lucide-react';
import TopPollsWidget from './TopPollsWidget';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { usePollAdminResource } from './usePollAdminResource';
import { consensusStats } from './pollAdminModel';

const renderMetric = (Icon, label, value, hint) => (
  <div key={label} className="rounded-lg bg-surface-2 p-4 flex items-start gap-3">
    <Icon className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
    <div>
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs font-medium text-subtle">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  </div>
);

const RANGE_TEXT = { today: 'today', '7d': 'in the last 7 days', '30d': 'in the last 30 days', all: 'all time' };

export default function PollOverview({ version = 0, summary, onViewDetails }) {
  const [range, setRange] = useState('all');
  const res = usePollAdminResource(() => pollAdminApi.analytics({ range }), `overview:${range}:${version}`);
  const a = res.data;
  const consensus = consensusStats(a?.polls || []);

  return (
    <div className="space-y-6">
      <TopPollsWidget
        polls={a?.polls || []}
        isLoading={res.isLoading || (res.isFetching && !a)}
        error={res.error ? errorMessage(res.error, 'Could not load top polls.') : null}
        onRetry={res.reload}
        range={range}
        onRangeChange={setRange}
        onViewDetails={onViewDetails}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Participation {RANGE_TEXT[range]}</CardTitle>
        </CardHeader>
        <CardContent>
          {res.error && !a ? (
            <div role="alert" className="text-sm text-sell-muted-foreground flex items-center gap-3">
              {errorMessage(res.error, 'Could not load participation.')}
              <Button size="sm" variant="outline" onClick={res.reload}>Try again</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy={res.isFetching}>
              {renderMetric(Vote, 'Votes cast', a ? a.participation.total_votes : '-', a ? `${a.participation.polls_with_votes} of ${a.participation.polls_in_scope} polls received votes` : null)}
              {renderMetric(Users, 'Unique voters', a ? a.participation.unique_voters : '-', a ? `${a.participation.votes_per_voter} votes per voter` : null)}
              {renderMetric(Percent, 'Turnout', a ? (a.participation.turnout_pct === null ? 'n/a' : `${a.participation.turnout_pct}%`) : '-', a && a.participation.registered_users ? `of ${a.participation.registered_users} registered members` : null)}
              {renderMetric(Activity, 'Average consensus', a ? `${consensus.average}%` : '-', a ? `${consensus.strong} strong, ${consensus.split} split` : null)}
            </div>
          )}
          {summary && summary.hidden > 0 && (
            <p className="mt-4 text-sm text-subtle">
              {summary.hidden} poll{summary.hidden === 1 ? ' is' : 's are'} hidden by moderators. Filter Manage Polls by <span className="font-medium text-foreground">Hidden</span> to review.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
