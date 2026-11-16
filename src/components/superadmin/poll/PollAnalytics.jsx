import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart3, Users, Vote, Percent, Target, Activity, Info } from 'lucide-react';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { usePollAdminResource } from './usePollAdminResource';
import { sentimentBreakdown, consensusStats, bucketLabel, typeLabel, rankPolls, pollTitle } from './pollAdminModel';

const TONE_BG = { positive: 'bg-buy', negative: 'bg-sell', neutral: 'bg-hold', other: 'bg-primary' };
const RANGE_LABEL = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time' };

function renderKpi(Icon, label, value, definition) {
  return (
    <div key={label} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-subtle text-xs font-medium">
        <Icon className="w-4 h-4 text-primary" aria-hidden="true" />{label}
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{definition}</p>
    </div>
  );
}

function renderSegmentTable(title, rows) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <table className="w-full text-sm">
        <thead className="text-xs text-subtle">
          <tr><th scope="col" className="text-left font-medium py-1">Segment</th><th scope="col" className="text-right font-medium">Polls</th><th scope="col" className="text-right font-medium">Votes</th><th scope="col" className="text-right font-medium">Voters</th><th scope="col" className="text-right font-medium">Votes / poll</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="text-left font-normal py-1.5">{r.label}</th>
              <td className="text-right tabular-nums">{r.polls}</td>
              <td className="text-right tabular-nums">{r.votes}</td>
              <td className="text-right tabular-nums">{r.voters}</td>
              <td className="text-right tabular-nums">{r.avg_votes_per_poll}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Poll analytics. Every number comes from GET /api/polls/admin/analytics, which
 * counts PollVote rows inside the selected range (see PollAdminService for the
 * definitions). Sentiment and consensus are derived here from those counts with
 * getPollTally, the function member poll cards use.
 */
export default function PollAnalytics({ version = 0, onViewDetails }) {
  const [range, setRange] = useState('30d');
  const [bucket, setBucket] = useState('auto');
  const res = usePollAdminResource(() => pollAdminApi.analytics({ range, bucket }), `analytics:${range}:${bucket}:${version}`);
  const a = res.data;

  const derived = useMemo(() => {
    if (!a) return null;
    return {
      sentiment: sentimentBreakdown(a.polls),
      consensus: consensusStats(a.polls),
      top: rankPolls(a.polls, 'votes', 5),
      chart: a.activity.map((b) => ({ ...b, label: bucketLabel(b.start, a.bucket) })),
    };
  }, [a]);

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-subtle">
        {a ? `${RANGE_LABEL[a.range]} · ${a.bucket === 'week' ? 'weekly' : 'daily'} buckets · updated ${new Date(a.generated_at).toLocaleTimeString()}` : 'Loading analytics...'}
      </p>
      <div className="flex items-center gap-2">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[150px]" aria-label="Analytics time range"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RANGE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="w-[130px]" aria-label="Group activity by"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (res.isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        {controls}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 rounded-xl bg-surface-2 animate-pulse" />)}</div>
        <div className="h-80 rounded-xl bg-surface-2 animate-pulse" />
      </div>
    );
  }

  if (res.error && !a) {
    return (
      <div className="space-y-6">
        {controls}
        <div role="alert" className="rounded-xl border border-sell/30 bg-sell-muted p-6 text-center space-y-3">
          <p className="text-sm text-sell-muted-foreground">{errorMessage(res.error, 'Could not load analytics.')}</p>
          <Button variant="outline" size="sm" onClick={res.reload}>Try again</Button>
        </div>
      </div>
    );
  }

  const p = a.participation;
  const noData = p.polls_in_scope === 0;

  return (
    <div className={`space-y-6 transition-opacity ${res.isFetching ? 'opacity-70' : ''}`} aria-busy={res.isFetching}>
      {controls}
      {a.truncated && <p className="text-xs text-hold-muted-foreground">Very large range: only the first 250,000 votes were analysed.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {renderKpi(Vote, 'Votes cast', p.total_votes, 'Votes cast in this period (one per member per poll).')}
        {renderKpi(Users, 'Unique voters', p.unique_voters, 'Different members who voted at least once.')}
        {renderKpi(Percent, 'Turnout', p.turnout_pct === null ? 'n/a' : `${p.turnout_pct}%`, `Unique voters out of ${p.registered_users ?? 'all'} registered members.`)}
        {renderKpi(BarChart3, 'Avg votes / poll', p.avg_votes_per_poll, `Across ${p.polls_in_scope} polls created or voted on in this period.`)}
        {renderKpi(Activity, 'Participation rate', `${p.participation_rate}%`, `${p.polls_with_votes} of ${p.polls_in_scope} polls received at least one vote.`)}
        {renderKpi(Target, 'Votes per voter', p.votes_per_voter, 'How many polls an average voter took part in.')}
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Voting activity</CardTitle></CardHeader>
        <CardContent>
          {p.total_votes === 0 && derived.chart.every((b) => b.new_polls === 0) ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No votes or new polls in this period.</div>
          ) : (
            <div className="h-72" role="img" aria-label={`Votes per ${a.bucket}: ${derived.chart.map((b) => `${b.label} ${b.votes}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={derived.chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" name="Votes" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  <Line dataKey="voters" name="Unique voters" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} type="monotone" />
                  <Line dataKey="new_polls" name="New polls" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Community sentiment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {derived.sentiment.total === 0 ? (
              <p className="text-sm text-muted-foreground">No votes in this period.</p>
            ) : (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-border" role="img"
                  aria-label={derived.sentiment.items.map((i) => `${i.label} ${i.share}%`).join(', ')}>
                  {derived.sentiment.items.map((i) => i.count > 0 && <div key={i.key} className={TONE_BG[i.key]} style={{ width: `${i.share}%` }} />)}
                </div>
                <ul className="space-y-1.5 text-sm">
                  {derived.sentiment.items.filter((i) => i.count > 0 || i.key !== 'other').map((i) => (
                    <li key={i.key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${TONE_BG[i.key]}`} aria-hidden="true" />{i.label}</span>
                      <span className="tabular-nums">{i.count} ({i.share}%)</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border text-center">
              <div><p className="text-lg font-bold tabular-nums">{derived.consensus.average}%</p><p className="text-[11px] text-subtle">Avg. consensus</p></div>
              <div><p className="text-lg font-bold tabular-nums">{derived.consensus.strong}</p><p className="text-[11px] text-subtle">Strong (70%+)</p></div>
              <div><p className="text-lg font-bold tabular-nums">{derived.consensus.split}</p><p className="text-[11px] text-subtle">Split / tied</p></div>
            </div>
            <p className="text-[11px] text-muted-foreground">Consensus is the leading option&apos;s share of a poll&apos;s votes, averaged over polls with votes.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Engagement by segment</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {renderSegmentTable('Access', [{ label: 'Premium', ...a.segments.premium }, { label: 'General', ...a.segments.general }])}
            {renderSegmentTable('Created by', [{ label: 'Admin', ...a.segments.admin }, { label: 'Community', ...a.segments.community }])}
            {a.by_type.length > 0 && renderSegmentTable('Poll type', a.by_type.map((t) => ({ ...t, label: typeLabel(t.type) })))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Most voted polls</CardTitle></CardHeader>
          <CardContent>
            {noData || derived.top.length === 0 ? <p className="text-sm text-muted-foreground">No polls in this period.</p> : (
              <ol className="divide-y divide-border">
                {derived.top.map(({ poll, tally }, i) => (
                  <li key={poll.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <button type="button" onClick={() => onViewDetails(poll)} className="text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded min-w-0">
                      <span className="text-primary font-semibold mr-2">{i + 1}.</span>
                      <span className="truncate">{pollTitle(poll)}</span>
                    </button>
                    <span className="shrink-0 tabular-nums text-subtle">{tally.total} votes · {tally.uniqueVoters} voters{tally.leader ? ` · ${tally.leader.label} ${tally.leader.rounded}%` : ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Most polled stocks</CardTitle></CardHeader>
          <CardContent>
            {a.top_stocks.length === 0 ? <p className="text-sm text-muted-foreground">No stock-linked polls in this period.</p> : (
              <ul className="space-y-2">
                {a.top_stocks.map((s) => {
                  const max = a.top_stocks[0].votes || 1;
                  return (
                    <li key={s.symbol} className="text-sm">
                      <div className="flex justify-between"><span className="font-medium">{s.symbol}</span><span className="tabular-nums text-subtle">{s.votes} votes · {s.polls} poll{s.polls === 1 ? '' : 's'}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-border" role="presentation"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(s.votes / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
        Counts come from individual vote records (not stored counters), so they match what members see. Votes on deleted polls are excluded. Status now: {a.status_counts.active} active, {a.status_counts.closed} closed, {a.status_counts.hidden} hidden.
      </p>
    </div>
  );
}
