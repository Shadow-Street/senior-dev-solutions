import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { StatCard, LiveFeed } from './DashboardWidgets';
import { Users, Crown, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

/** Timestamp off a record, whichever spelling it carries. */
const timeOf = (r) => {
    const raw = r?.created_at || r?.created_date || r?.createdAt;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
};

/**
 * Month-over-month change, computed from the records already on screen.
 *
 * Returns null when there is no prior-period baseline to compare against,
 * and the caller then shows no trend at all. A made-up percentage on an
 * admin dashboard is worse than no percentage: it invites decisions.
 */
const trendFor = (records) => {
    const now = Date.now();
    const DAY = 86400000;
    let current = 0;
    let previous = 0;
    for (const r of records || []) {
        const d = timeOf(r);
        if (!d) continue;
        const age = now - d.getTime();
        if (age <= 30 * DAY) current += 1;
        else if (age <= 60 * DAY) previous += 1;
    }
    if (previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    return { trend: pct >= 0 ? 'up' : 'down', trendValue: `${Math.abs(Math.round(pct))}%` };
};

export default function AdminDashboardOverview({ users, polls, advisorApps, moderationLogs }) {

    // Calculate stats
    const totalUsers = users.length;
    const premiumUsers = users.filter(u => u.is_premium).length;
    const totalPolls = polls.length;
    const activePolls = polls.filter(p => p.is_active).length;
    const pendingModeration = moderationLogs.length;
    const pendingAdvisors = advisorApps.filter(a => a.status === 'pending_approval').length;

    const userTrend = trendFor(users);
    const premiumTrend = trendFor(users.filter(u => u.is_premium));
    const pollTrend = trendFor(polls);

    /**
     * New users and polls per month over the last six months, from the same
     * records the cards above count. This panel previously held a 400px
     * placeholder reading "charts coming soon".
     */
    const growth = useMemo(() => {
        const months = [];
        const base = new Date();
        base.setDate(1);
        base.setHours(0, 0, 0, 0);
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(base);
            d.setMonth(d.getMonth() - i);
            months.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleString(undefined, { month: 'short' }),
                users: 0,
                polls: 0,
            });
        }
        const index = new Map(months.map((m) => [m.key, m]));
        const bucket = (records, field) => {
            for (const r of records || []) {
                const d = timeOf(r);
                if (!d) continue;
                const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const m = index.get(k);
                if (m) m[field] += 1;
            }
        };
        bucket(users, 'users');
        bucket(polls, 'polls');
        return months;
    }, [users, polls]);

    /**
     * Real recent activity, assembled from the records this page already
     * loads. This was previously four invented entries — "Alice Trader",
     * "Bob Finance" and friends — rendered as if they were live platform
     * events. None of those people exist, and an administrator reading the
     * panel had no way to tell.
     */
    const liveActivity = useMemo(() => {
        const byId = new Map((users || []).map(u => [String(u.id), u]));
        const entries = [];

        for (const u of users || []) {
            const d = timeOf(u);
            if (d) entries.push({ at: d, user: { name: u.full_name || u.name || u.email, image_url: u.profile_image_url }, action: 'joined the platform', target: '' });
        }
        for (const p of polls || []) {
            const d = timeOf(p);
            if (d) entries.push({ at: d, user: byId.get(String(p.created_by)) || { name: 'A member' }, action: 'created a poll', target: p.title || p.stock_symbol || '' });
        }
        for (const a of advisorApps || []) {
            const d = timeOf(a);
            if (d) entries.push({ at: d, user: byId.get(String(a.user_id)) || { name: a.display_name || 'An applicant' }, action: 'applied as an advisor', target: a.sebi_registration_number || '' });
        }
        for (const m of moderationLogs || []) {
            const d = timeOf(m);
            if (d) entries.push({ at: d, user: byId.get(String(m.user_id)) || { name: 'A member' }, action: 'had content flagged', target: m.reason || '' });
        }

        return entries
            .sort((x, y) => y.at - x.at)
            .slice(0, 8)
            .map(e => ({ ...e, time: formatDistanceToNow(e.at, { addSuffix: true }) }));
    }, [users, polls, advisorApps, moderationLogs]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Trends come from the records themselves (last 30 days against
                    the 30 before) and are omitted entirely when there is no
                    prior period to compare with. They were previously fixed
                    strings — "12%", "5%", "2%", "High" — shown next to the
                    words "vs last month" on every deployment regardless of
                    what the data did. Pending Actions is a backlog count, not
                    a rate, so it carries no trend at all. */}
                <StatCard
                    title="Total Users"
                    value={totalUsers.toLocaleString()}
                    icon={Users}
                    trend={userTrend?.trend}
                    trendValue={userTrend?.trendValue}
                    color="blue"
                />
                <StatCard
                    title="Premium Members"
                    value={premiumUsers.toLocaleString()}
                    icon={Crown}
                    trend={premiumTrend?.trend}
                    trendValue={premiumTrend?.trendValue}
                    color="purple"
                />
                <StatCard
                    title="Active Polls"
                    value={activePolls.toLocaleString()}
                    icon={MessageSquare}
                    trend={pollTrend?.trend}
                    trendValue={pollTrend?.trendValue}
                    color="green"
                />
                <StatCard
                    title="Pending Actions"
                    value={(pendingModeration + pendingAdvisors).toLocaleString()}
                    icon={AlertTriangle}
                    color="red"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Analytics / Charts Placeholder */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm h-[400px] flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Growth</h3>
                            <p className="text-sm text-muted-foreground">
                                New users and polls per month, last six months
                            </p>
                        </div>
                        {growth.some((m) => m.users || m.polls) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growth} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                                    <defs>
                                        <linearGradient id="adminUsersFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="hsl(var(--tile-blue))" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="hsl(var(--tile-blue))" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="adminPollsFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="hsl(var(--tile-green))" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="hsl(var(--tile-green))" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    {/* Counts are whole numbers, so no fractional ticks. */}
                                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: 8,
                                            color: 'hsl(var(--foreground))',
                                        }}
                                    />
                                    <Area type="monotone" dataKey="users" name="New users" stroke="hsl(var(--tile-blue))" fill="url(#adminUsersFill)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="polls" name="New polls" stroke="hsl(var(--tile-green))" fill="url(#adminPollsFill)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-center">
                                <div>
                                    <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        No activity recorded in the last six months yet.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Feed */}
                <div className="lg:col-span-1">
                    <LiveFeed items={liveActivity} />
                </div>
            </div>
        </div>
    );
}
