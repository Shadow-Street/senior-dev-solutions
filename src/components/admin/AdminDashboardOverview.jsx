import React from 'react';
import { StatCard, LiveFeed } from './DashboardWidgets';
import { Users, Crown, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminDashboardOverview({ users, polls, advisorApps, moderationLogs }) {

    // Calculate stats
    const totalUsers = users.length;
    const premiumUsers = users.filter(u => u.is_premium).length;
    const totalPolls = polls.length;
    const activePolls = polls.filter(p => p.is_active).length;
    const pendingModeration = moderationLogs.length;
    const pendingAdvisors = advisorApps.filter(a => a.status === 'pending_approval').length;

    // Mock live feed data (replace with real data/socket later)
    const liveActivity = [
        { user: { name: 'Alice Trader' }, action: 'created a new poll', target: 'AAPL vs MSFT', time: '2 mins ago' },
        { user: { name: 'Bob Finance' }, action: 'subscribed to', target: 'Pro Plan', time: '5 mins ago' },
        { user: { name: 'Charlie Day' }, action: 'reported a message in', target: '#general', time: '12 mins ago' },
        { user: { name: 'Dana White' }, action: 'applied for', target: 'Advisor Role', time: '30 mins ago' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={totalUsers.toLocaleString()}
                    icon={Users}
                    trend="up"
                    trendValue="12%"
                    color="blue"
                />
                <StatCard
                    title="Premium Members"
                    value={premiumUsers.toLocaleString()}
                    icon={Crown}
                    trend="up"
                    trendValue="5%"
                    color="purple"
                />
                <StatCard
                    title="Active Polls"
                    value={activePolls.toLocaleString()}
                    icon={MessageSquare}
                    trend="down"
                    trendValue="2%"
                    color="green"
                />
                <StatCard
                    title="Pending Actions"
                    value={(pendingModeration + pendingAdvisors).toLocaleString()}
                    icon={AlertTriangle}
                    trend="up"
                    trendValue="High"
                    color="red"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Analytics / Charts Placeholder */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px] flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="text-center z-10">
                            <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-600">Analytics Dashboard</h3>
                            <p className="text-slate-400">User growth and engagement charts coming soon...</p>
                        </div>
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
