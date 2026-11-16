import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Star, Pencil, Lock, Unlock, EyeOff, Eye, Sparkles, Trash2, History, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { getPollTally } from '@/lib/pollVotes';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { usePollAdminResource } from './usePollAdminResource';
import { STATUS_META, pollTitle, typeLabel } from './pollAdminModel';

const TONE_BAR = { positive: 'bg-buy', negative: 'bg-sell', neutral: 'bg-hold', other: 'bg-primary' };
const fmt = (value, pattern = 'd MMM yyyy, HH:mm') => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? format(d, pattern) : '-';
};

function renderBody(data, canManage, onEdit, onAction) {
  const { poll, creator, voters, voters_truncated: votersTruncated, history } = data;
  const tally = getPollTally(poll);
  const status = STATUS_META[poll.admin_status] || STATUS_META.active;
  const days = Math.max(1, Math.ceil((Date.now() - new Date(poll.created_at).getTime()) / 86400000));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl pr-6">{pollTitle(poll)}</DialogTitle>
        <DialogDescription asChild>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {poll.stock_symbol && <Badge variant="outline">{poll.stock_symbol}</Badge>}
            <Badge variant="outline" className={status.className}>{status.label}</Badge>
            {poll.is_premium ? <Badge className="bg-premium-muted text-primary border-0"><Crown className="w-3 h-3 mr-1" aria-hidden="true" />Premium</Badge> : <Badge variant="secondary">General</Badge>}
            {poll.is_featured && <Badge className="bg-primary/10 text-primary border-0">Featured until {fmt(poll.boost_expires_at, 'd MMM')}</Badge>}
            {poll.is_admin_poll && <Badge variant="secondary">Admin created</Badge>}
          </div>
        </DialogDescription>
      </DialogHeader>

      {canManage && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(poll)}><Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" />Edit</Button>
          {poll.admin_status === 'active' && <Button size="sm" variant="outline" onClick={() => onAction('close', poll)}><Lock className="w-4 h-4 mr-1.5" aria-hidden="true" />Close voting</Button>}
          {poll.admin_status === 'closed' && <Button size="sm" variant="outline" onClick={() => onAction('reopen', poll)}><Unlock className="w-4 h-4 mr-1.5" aria-hidden="true" />Reopen</Button>}
          {poll.is_featured
            ? <Button size="sm" variant="outline" onClick={() => onAction('unfeature', poll)}><Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />Unfeature</Button>
            : poll.admin_status === 'active' && <Button size="sm" variant="outline" onClick={() => onAction('feature', poll)}><Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" />Feature</Button>}
          {poll.admin_status === 'hidden'
            ? <Button size="sm" variant="outline" onClick={() => onAction('unhide', poll)}><Eye className="w-4 h-4 mr-1.5" aria-hidden="true" />Restore</Button>
            : <Button size="sm" variant="outline" onClick={() => onAction('hide', poll)}><EyeOff className="w-4 h-4 mr-1.5" aria-hidden="true" />Hide</Button>}
          <Button size="sm" variant="outline" className="text-sell-muted-foreground" onClick={() => onAction('delete', poll)}><Trash2 className="w-4 h-4 mr-1.5" aria-hidden="true" />Delete</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-border p-4" aria-labelledby="poll-results">
            <h3 id="poll-results" className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" aria-hidden="true" />
              Results: {tally.total} vote{tally.total === 1 ? '' : 's'} from {tally.uniqueVoters} voter{tally.uniqueVoters === 1 ? '' : 's'}
            </h3>
            <ul className="space-y-3">
              {tally.options.map((o) => (
                <li key={o.index} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm font-medium" title={o.label}>{o.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden" role="presentation">
                    <div className={`${TONE_BAR[o.tone]} h-2`} style={{ width: `${o.percentage}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm tabular-nums">{o.count} ({o.rounded}%)</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border p-4" aria-labelledby="poll-voters">
            <h3 id="poll-voters" className="font-semibold mb-3">Voters ({voters.length}{votersTruncated ? '+' : ''})</h3>
            {voters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No votes yet.</p>
            ) : (
              <ul className="max-h-56 overflow-y-auto divide-y divide-border">
                {voters.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      {v.user.image
                        ? <img src={v.user.image} alt="" className="w-6 h-6 rounded-full object-cover" />
                        : <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center" aria-hidden="true">{v.user.name.charAt(0)}</span>}
                      <span className="truncate">{v.user.name}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline">{v.option_label}</Badge>
                      <span className="text-xs text-muted-foreground w-28 text-right">{fmt(v.voted_at, 'd MMM, HH:mm')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {poll.is_anonymous && <p className="mt-2 text-xs text-muted-foreground">This is an anonymous poll, so voter identities are not shown.</p>}
          </section>

          <section className="rounded-lg border border-border p-4" aria-labelledby="poll-history">
            <h3 id="poll-history" className="font-semibold mb-3 flex items-center gap-2"><History className="w-4 h-4" aria-hidden="true" />Moderation history</h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin changes recorded for this poll.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-4">
                    <span>{h.description}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(h.created_at, 'd MMM, HH:mm')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg bg-surface-2 p-4 text-sm space-y-2.5" aria-label="Poll information">
            {renderRow('Created by', creator?.name || 'Unknown')}
            {renderRow('Created', fmt(poll.created_at))}
            {renderRow('Ends', poll.expires_at ? fmt(poll.expires_at) : 'No end time')}
            {renderRow('Type', typeLabel(poll.poll_type))}
            {renderRow('Source', poll.creation_source === 'admin_panel' ? 'Admin panel' : poll.creation_source === 'chatroom' ? 'Chat room' : 'Community')}
            {poll.target_price != null && renderRow('Target price', `₹${Number(poll.target_price).toLocaleString('en-IN')}`)}
            {poll.confidence_score != null && (
              <div className="flex justify-between">
                <span className="text-subtle">Confidence</span>
                <span className="flex items-center gap-0.5" aria-label={`${poll.confidence_score} out of 5`}>
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} className={`w-3 h-3 ${i < poll.confidence_score ? 'fill-hold text-hold' : 'text-muted-foreground'}`} aria-hidden="true" />)}
                </span>
              </div>
            )}
          </section>
          <section className="rounded-lg bg-surface-2 p-4 text-sm space-y-2.5" aria-label="Quick stats">
            {renderRow('Leading option', tally.leader ? (tally.leader.tie ? `Tie (${tally.leader.label})` : tally.leader.label) : 'No votes')}
            {renderRow('Consensus', tally.leader ? `${tally.leader.rounded}%` : '-')}
            {renderRow('Days live', days)}
            {renderRow('Votes per day', (tally.total / days).toFixed(1))}
          </section>
          {poll.description && (
            <section className="rounded-lg border border-border p-4 text-sm">
              <h3 className="text-subtle mb-1">Description</h3>
              <p className="whitespace-pre-line">{poll.description}</p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

const renderRow = (label, value) => (
  <div key={label} className="flex justify-between gap-3">
    <span className="text-subtle">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

/** Poll details, loaded fresh from the server each time it opens (and after any change). */
export default function PollDetailsModal({ pollId, version = 0, canManage, onClose, onEdit, onAction }) {
  return (
    <Dialog open={Boolean(pollId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        {pollId && <DetailsLoader pollId={pollId} version={version} canManage={canManage} onEdit={onEdit} onAction={onAction} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailsLoader({ pollId, version, canManage, onEdit, onAction }) {
  const res = usePollAdminResource(() => pollAdminApi.details(pollId), `${pollId}:${version}`);
  if (res.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <DialogTitle className="sr-only">Loading poll</DialogTitle>
        <div className="h-7 w-2/3 rounded bg-surface-2 animate-pulse" />
        <div className="h-40 rounded bg-surface-2 animate-pulse" />
      </div>
    );
  }
  if (res.error && !res.data) {
    return (
      <div role="alert" className="py-8 text-center space-y-3">
        <DialogTitle>Could not load this poll</DialogTitle>
        <p className="text-sm text-sell-muted-foreground">{errorMessage(res.error, 'Please try again.')}</p>
        <Button variant="outline" size="sm" onClick={res.reload}>Try again</Button>
      </div>
    );
  }
  return renderBody(res.data, canManage, onEdit, onAction);
}
