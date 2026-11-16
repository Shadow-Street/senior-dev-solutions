import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Vote, Plus, Download, BarChart3, TrendingUp, Shield, Crown, PieChart, Target, RefreshCw, EyeOff, Users } from 'lucide-react';
import { toast } from 'sonner';

import PollOverview from './poll/PollOverview';
import PollTable from './poll/PollTable';
import PollAnalytics from './poll/PollAnalytics';
import CreatePollModal from './poll/CreatePollModal';
import PollDetailsModal from './poll/PollDetailsModal';
import { usePollActions } from './poll/usePollActions';
import TomorrowsPickOverride from './poll/TomorrowsPickOverride';
import { pollAdminApi, errorMessage } from './poll/pollAdminApi';
import { pollsToCsv, downloadTextFile } from './poll/pollAdminModel';
import { usePollAdminResource, useSessionState } from './poll/usePollAdminResource';

const TAB_CLASS =
  'h-10 w-full rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap ' +
  'bg-surface-2 text-primary shadow-sm transition-colors hover:bg-primary/10 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md';

const TABS = [
  { value: 'overview', label: 'Overview', icon: BarChart3 },
  { value: 'polls', label: 'Manage Polls', icon: Vote },
  { value: 'analytics', label: 'Analytics', icon: PieChart },
  { value: 'tomorrows-pick', label: "Tomorrow's Pick", icon: Target },
];

function renderStatCard(label, value, hint, Icon, loading) {
  return (
    <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
      <div className="rounded-full bg-primary/10 p-2.5 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-surface-2" /> : value}
        </p>
        <p className="text-xs font-medium text-subtle">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Super Admin > Poll Management.
 *
 * Data loads once on mount and again only when the admin changes a filter,
 * presses Refresh, or makes a change. There are no timers and the screen is
 * never replaced by a spinner after the first load (see usePollAdminResource).
 */
export default function PollManagement({ user }) {
  const canManage = ['admin', 'super_admin'].includes(user?.app_role || user?.role);
  const [view, setView] = useSessionState('protocall.pollManagement.view', { tab: 'overview' });
  const [visited, setVisited] = useState(() => new Set([view.tab]));
  const [listVersion, setListVersion] = useState(0);

  const summary = usePollAdminResource(() => pollAdminApi.summary(), 'summary');

  const [showCreate, setShowCreate] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setTab = (tab) => {
    setView((v) => ({ ...v, tab }));
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  };

  /** After any change: refresh the stat cards and whichever lists are mounted. */
  const refreshAll = useCallback(() => {
    summary.reload();
    setListVersion((n) => n + 1);
  }, [summary.reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshAll();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleSaved = (message) => {
    toast.success(message);
    refreshAll();
  };

  const actions = usePollActions({
    onDone: (message, { deleted } = {}) => {
      if (deleted) setDetailsId(null);
      handleSaved(message);
    },
  });

  const exportPolls = async () => {
    setIsExporting(true);
    try {
      const all = [];
      for (let page = 1; page <= 20; page += 1) {
        const res = await pollAdminApi.list({ ...(view.filters || {}), page, limit: 100 });
        all.push(...res.items);
        if (page >= res.pages) break;
      }
      if (!all.length) {
        toast.info('No polls match the current filters');
        return;
      }
      downloadTextFile(`polls-${new Date().toISOString().slice(0, 10)}.csv`, pollsToCsv(all));
      toast.success(`Exported ${all.length} poll${all.length === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const s = summary.data;
  const statsLoading = summary.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Poll Management</h2>
          <p className="text-subtle">Manage, monitor and moderate community polls</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button onClick={exportPolls} variant="outline" disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          {canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Create Poll
            </Button>
          )}
        </div>
      </div>

      {summary.error && !s ? (
        <div role="alert" className="rounded-xl border border-sell/30 bg-sell-muted p-4 text-sm text-sell-muted-foreground flex items-center justify-between gap-4">
          <span>{errorMessage(summary.error, 'Could not load poll statistics.')}</span>
          <Button size="sm" variant="outline" onClick={summary.reload}>Try again</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {renderStatCard('Total Polls', s?.total ?? 0, s ? `${s.closed} closed` : null, Vote, statsLoading)}
          {renderStatCard('Active', s?.active ?? 0, s ? `${s.featured} featured` : null, TrendingUp, statsLoading)}
          {renderStatCard('Hidden', s?.hidden ?? 0, 'moderated', EyeOff, statsLoading)}
          {renderStatCard('Premium', s?.premium ?? 0, null, Crown, statsLoading)}
          {renderStatCard('Admin Created', s?.admin ?? 0, null, Shield, statsLoading)}
          {renderStatCard('Total Votes', s?.total_votes ?? 0, s ? `${s.unique_voters} unique voter${s.unique_voters === 1 ? '' : 's'}` : null, Users, statsLoading)}
        </div>
      )}

      <Tabs value={view.tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid h-auto grid-cols-2 md:grid-cols-4 gap-2 bg-transparent p-0">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className={TAB_CLASS}>
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tabs stay mounted once opened, so switching never loses a form or a filter. */}
        <TabsContent value="overview" forceMount className="mt-0 data-[state=inactive]:hidden">
          {visited.has('overview') && (
            <PollOverview version={listVersion} summary={s} onViewDetails={(p) => setDetailsId(p.id)} />
          )}
        </TabsContent>
        <TabsContent value="polls" forceMount className="mt-0 data-[state=inactive]:hidden">
          {visited.has('polls') && (
            <PollTable
              version={listVersion}
              filters={view.filters}
              onFiltersChange={(filters) => setView((v) => ({ ...v, filters }))}
              canManage={canManage}
              onViewDetails={(p) => setDetailsId(p.id)}
              onEdit={setEditingPoll}
              onAction={actions.run}
            />
          )}
        </TabsContent>
        <TabsContent value="analytics" forceMount className="mt-0 data-[state=inactive]:hidden">
          {visited.has('analytics') && <PollAnalytics version={listVersion} onViewDetails={(p) => setDetailsId(p.id)} />}
        </TabsContent>
        <TabsContent value="tomorrows-pick" forceMount className="mt-0 data-[state=inactive]:hidden">
          {visited.has('tomorrows-pick') && <TomorrowsPickOverride canManage={canManage} />}
        </TabsContent>
      </Tabs>

      {canManage && (
        <CreatePollModal
          open={showCreate || Boolean(editingPoll)}
          poll={editingPoll}
          onClose={() => { setShowCreate(false); setEditingPoll(null); }}
          onSaved={(message) => { setShowCreate(false); setEditingPoll(null); handleSaved(message); }}
        />
      )}

      <PollDetailsModal
        pollId={detailsId}
        version={listVersion}
        canManage={canManage}
        onClose={() => setDetailsId(null)}
        onEdit={(poll) => { setDetailsId(null); setEditingPoll(poll); }}
        onAction={actions.run}
      />

      {canManage && actions.dialog}
    </div>
  );
}
