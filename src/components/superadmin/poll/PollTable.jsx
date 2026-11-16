import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical, Crown, Trash2, Eye, Pencil, Lock, Unlock, EyeOff, Sparkles, Search, Vote, ChevronLeft, ChevronRight, MessageSquare, ClipboardList,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getPollTally } from '@/lib/pollVotes';
import { pollAdminApi, errorMessage } from './pollAdminApi';
import { usePollAdminResource, useDebounced } from './usePollAdminResource';
import { STATUS_META, pollTitle, typeLabel } from './pollAdminModel';

const DEFAULT_FILTERS = { search: '', status: 'all', type: 'all', range: 'all', sort: 'newest', page: 1 };
const PAGE_SIZE = 20;
const TONE_BAR = { positive: 'bg-buy', negative: 'bg-sell', neutral: 'bg-hold', other: 'bg-primary' };

const ago = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : '-';
};

function renderVoteSummary(poll) {
  const t = getPollTally(poll);
  return (
    <div className="min-w-[150px]">
      <div className="text-sm text-foreground tabular-nums">
        {t.total} vote{t.total === 1 ? '' : 's'}
        <span className="text-xs text-muted-foreground"> · {t.uniqueVoters} voter{t.uniqueVoters === 1 ? '' : 's'}</span>
      </div>
      <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-border" role="img"
        aria-label={t.total ? t.options.map((o) => `${o.label} ${o.rounded}%`).join(', ') : 'No votes yet'}>
        {t.options.map((o) => o.count > 0 && (
          <div key={o.index} className={TONE_BAR[o.tone]} style={{ width: `${o.percentage}%` }} />
        ))}
      </div>
      {t.leader && (
        <div className="mt-1 text-xs text-subtle">{t.leader.tie ? 'Tied' : `${t.leader.label} leads, ${t.leader.rounded}%`}</div>
      )}
    </div>
  );
}

function renderStatusCell(poll) {
  const meta = STATUS_META[poll.admin_status] || STATUS_META.active;
  const ends = poll.expires_at ? new Date(poll.expires_at) : null;
  return (
    <div className="space-y-1">
      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
      {poll.admin_status === 'active' && ends && <div className="text-xs text-muted-foreground">ends {ago(ends)}</div>}
      {poll.is_featured && <div><Badge className="bg-primary/10 text-primary border-0"><Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />Featured</Badge></div>}
    </div>
  );
}

/** Manage Polls tab: server-side search, filters and pagination. */
export default function PollTable({ version = 0, filters: stored, onFiltersChange, canManage, onViewDetails, onEdit, onAction }) {
  const filters = { ...DEFAULT_FILTERS, ...(stored || {}) };
  const [searchText, setSearchText] = useState(filters.search);
  const search = useDebounced(searchText, 350);

  const update = (patch) => onFiltersChange({ ...filters, page: 1, ...patch });

  // The debounced search becomes a real filter (and resets to page 1).
  useEffect(() => {
    if (search !== filters.search) update({ search });
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = { search: filters.search, status: filters.status, type: filters.type, range: filters.range, sort: filters.sort, page: filters.page, limit: PAGE_SIZE };
  const key = `${JSON.stringify(params)}:${version}`;
  const res = usePollAdminResource(() => pollAdminApi.list(params), key);
  const items = res.data?.items || [];
  const isFiltered = filters.search || filters.status !== 'all' || filters.type !== 'all' || filters.range !== 'all';

  const clear = () => {
    setSearchText('');
    onFiltersChange({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
              <Input
                aria-label="Search polls"
                placeholder="Search by title, question or stock symbol..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(status) => update({ status })}>
              <SelectTrigger className="w-full lg:w-36" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed / Ended</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(type) => update({ type })}>
              <SelectTrigger className="w-full lg:w-40" aria-label="Type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="admin">Admin created</SelectItem>
                <SelectItem value="community">Community created</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.range} onValueChange={(range) => update({ range })}>
              <SelectTrigger className="w-full lg:w-36" aria-label="Created"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={(sort) => update({ sort })}>
              <SelectTrigger className="w-full lg:w-36" aria-label="Sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="ending">Ending soonest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0" aria-busy={res.isFetching}>
          {res.isLoading ? (
            <div className="p-4 space-y-3" aria-label="Loading polls">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-surface-2 animate-pulse" />)}
            </div>
          ) : res.error && !res.data ? (
            <div role="alert" className="p-8 text-center space-y-3">
              <p className="text-sm text-sell-muted-foreground">{errorMessage(res.error, 'Could not load polls.')}</p>
              <Button variant="outline" size="sm" onClick={res.reload}>Try again</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <Vote className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-2 text-sm font-medium text-foreground">{isFiltered ? 'No polls match your filters' : 'No polls yet'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isFiltered ? 'Try a different search or clear the filters.' : 'Polls created by the community or from this panel appear here.'}
              </p>
              {isFiltered && <Button variant="outline" onClick={clear} className="mt-4">Clear all filters</Button>}
            </div>
          ) : (
            <div className={`overflow-x-auto transition-opacity ${res.isFetching ? 'opacity-60' : ''}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Poll</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Votes & results</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((poll) => (
                    <TableRow key={poll.id}>
                      <TableCell>
                        <button type="button" onClick={() => onViewDetails(poll)} className="text-left font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                          {pollTitle(poll)}
                        </button>
                        {poll.description && <div className="text-xs text-muted-foreground line-clamp-1">{poll.description}</div>}
                      </TableCell>
                      <TableCell>{poll.stock_symbol ? <Badge variant="outline">{poll.stock_symbol}</Badge> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{renderVoteSummary(poll)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {poll.creation_source === 'chatroom'
                            ? <MessageSquare className="w-4 h-4 text-muted-foreground" aria-label="Created in a chat room" />
                            : <ClipboardList className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="text-subtle">{typeLabel(poll.poll_type)}</span>
                            <div className="flex gap-1">
                              {poll.is_premium && <Badge className="bg-premium-muted text-primary border-0 text-[11px]">Premium</Badge>}
                              {poll.is_admin_poll && <Badge variant="secondary" className="text-[11px]">Admin</Badge>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{renderStatusCell(poll)}</TableCell>
                      <TableCell className="text-sm text-subtle whitespace-nowrap">{ago(poll.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${pollTitle(poll)}`}>
                              <MoreVertical className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => onViewDetails(poll)}><Eye className="w-4 h-4 mr-2" />View details</DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem onSelect={() => onEdit(poll)}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                                {poll.admin_status === 'active' && <DropdownMenuItem onSelect={() => onAction('close', poll)}><Lock className="w-4 h-4 mr-2" />Close voting</DropdownMenuItem>}
                                {poll.admin_status === 'closed' && <DropdownMenuItem onSelect={() => onAction('reopen', poll)}><Unlock className="w-4 h-4 mr-2" />Reopen</DropdownMenuItem>}
                                {poll.is_featured
                                  ? <DropdownMenuItem onSelect={() => onAction('unfeature', poll)}><Sparkles className="w-4 h-4 mr-2" />Unfeature</DropdownMenuItem>
                                  : poll.admin_status === 'active' && <DropdownMenuItem onSelect={() => onAction('feature', poll)}><Sparkles className="w-4 h-4 mr-2" />Feature</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => onAction(poll.is_premium ? 'general' : 'premium', poll)}>
                                  <Crown className="w-4 h-4 mr-2" />{poll.is_premium ? 'Make general' : 'Make premium'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {poll.admin_status === 'hidden'
                                  ? <DropdownMenuItem onSelect={() => onAction('unhide', poll)}><Eye className="w-4 h-4 mr-2" />Restore (unhide)</DropdownMenuItem>
                                  : <DropdownMenuItem onSelect={() => onAction('hide', poll)}><EyeOff className="w-4 h-4 mr-2" />Hide (moderate)</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => onAction('delete', poll)} className="text-sell-muted-foreground focus:text-sell-muted-foreground focus:bg-sell-muted">
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {res.data && res.data.total > 0 && (
        <nav className="flex items-center justify-between text-sm text-subtle" aria-label="Poll list pages">
          <span>
            Showing {(res.data.page - 1) * res.data.limit + 1}-{Math.min(res.data.page * res.data.limit, res.data.total)} of {res.data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => onFiltersChange({ ...filters, page: filters.page - 1 })} aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <span className="tabular-nums">Page {res.data.page} of {res.data.pages}</span>
            <Button variant="outline" size="sm" disabled={filters.page >= res.data.pages} onClick={() => onFiltersChange({ ...filters, page: filters.page + 1 })} aria-label="Next page">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
