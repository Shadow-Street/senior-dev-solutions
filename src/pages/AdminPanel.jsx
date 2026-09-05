import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, TrustScoreLog, ModerationLog, ContactInquiry, Advisor, PlatformSetting, Feedback, Poll } from '@/lib/apiClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, LayoutDashboard, User as UserIcon, BookUser, MessageSquare, Mail, Settings, MessageCircle, Menu } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

// Import new modular components
import AdminDashboardOverview from '@/components/admin/AdminDashboardOverview';
import UserManagement from '@/components/admin/UserManagement';
import ContentModeration from '@/components/admin/ContentModeration';
import PlatformSettings from '@/components/admin/PlatformSettings';

export default function AdminPanel() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('overview');

    // Data States
    const [users, setUsers] = useState([]);
    const [advisorApps, setAdvisorApps] = useState([]);
    const [polls, setPolls] = useState([]);
    const [moderationLogs, setModerationLogs] = useState([]);
    const [contactInquiries, setContactInquiries] = useState([]);
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [platformSettings, setPlatformSettings] = useState({});

    const isMountedRef = useRef(true);

    // Initial Load
    useEffect(() => {
        isMountedRef.current = true;
        const init = async () => {
            try {
                const user = await User.me();
                if (!isMountedRef.current) return;

                if (user && !user.is_admin) {
                    // Auto-grant (dev convenience, similar to original)
                    try {
                        await User.updateMyUserData({ is_admin: true, app_role: 'super_admin' });
                        setCurrentUser({ ...user, is_admin: true, app_role: 'super_admin' });
                    } catch (e) {
                        setCurrentUser({ ...user, is_admin: true, app_role: 'super_admin' });
                    }
                } else if (user) {
                    setCurrentUser(user);
                } else {
                    window.location.href = createPageUrl("Dashboard");
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                window.location.href = createPageUrl("Dashboard");
            } finally {
                if (isMountedRef.current) setIsLoading(false);
            }
        };
        init();
        return () => { isMountedRef.current = false; };
    }, []);

    // Data Fetchers
    const loadAllUsers = useCallback(async () => {
        try { const data = await User.list(); if (isMountedRef.current) setUsers(data); } catch (e) { console.error(e); }
    }, []);

    const loadPolls = useCallback(async () => {
        try { const data = await Poll.list('-created_at'); if (isMountedRef.current) setPolls(data); } catch (e) { console.error(e); }
    }, []);

    const loadAdvisorApps = useCallback(async () => {
        try { const data = await Advisor.list('-created_date'); if (isMountedRef.current) setAdvisorApps(data); } catch (e) { console.error(e); }
    }, []);

    const loadModerationLogs = useCallback(async () => {
        try { const data = await ModerationLog.filter({ admin_reviewed: false }, '-created_date', 50); if (isMountedRef.current) setModerationLogs(data); } catch (e) { console.error(e); }
    }, []);

    const loadSettings = useCallback(async () => {
        // Simplified loader for critical settings
        try {
            const p = await PlatformSetting.filter({ setting_key: 'pledges_enabled' });
            const c = await PlatformSetting.filter({ setting_key: 'global_commission_rate' });
            if (isMountedRef.current) {
                setPlatformSettings({
                    pledgesEnabled: p.length > 0 ? p[0].setting_value === 'true' : false,
                    commissionRate: c.length > 0 ? c[0].setting_value : '20'
                });
            }
        } catch (e) { console.error(e); }
    }, []);

    // Fetch data when tab changes or initially
    useEffect(() => {
        if (!currentUser?.is_admin) return;

        // Ideally, fetch only what is needed for the tab, but for 'Overview' we need a bit of everything
        // For simplicity in this v1 refactor, we can load most things if in overview, or specific things otherwise

        const loadBasics = () => {
            loadAllUsers();
            loadPolls();
            loadAdvisorApps();
            loadModerationLogs();
            loadSettings();
        };

        loadBasics();

        // Specific tab refresh logic could go here if optimized
    }, [currentUser, selectedTab, loadAllUsers, loadPolls, loadAdvisorApps, loadModerationLogs, loadSettings]);


    if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full rounded-xl" /></div>;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'Users', icon: UserIcon },
        { id: 'moderation', label: 'Content', icon: Shield },
        { id: 'advisors', label: 'Advisors', icon: BookUser },
        { id: 'polls', label: 'Polls', icon: MessageSquare }, // Could be merged into Content
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0">
                <div className="p-6">
                    <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Shield className="w-6 h-6 text-purple-600" />
                        Admin Panel
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Super Admin Access</p>
                </div>

                <nav className="px-3 space-y-1">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={selectedTab === tab.id ? 'secondary' : 'ghost'}
                            className={`w-full justify-start ${selectedTab === tab.id ? 'bg-purple-50 text-purple-700' : 'text-slate-600'}`}
                            onClick={() => setSelectedTab(tab.id)}
                        >
                            <tab.icon className="w-4 h-4 mr-3" />
                            {tab.label}
                        </Button>
                    ))}
                </nav>

                <div className="p-6 mt-auto">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                                {currentUser?.display_name?.[0] || 'A'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold truncate">{currentUser?.display_name}</p>
                                <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{tabs.find(t => t.id === selectedTab)?.label}</h2>
                        <p className="text-slate-500">Manage your platform efficiently.</p>
                    </div>
                    <div className="md:hidden">
                        {/* Mobile menu trigger could go here */}
                        <Button variant="outline" size="icon"><Menu className="w-4 h-4" /></Button>
                    </div>
                </header>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {selectedTab === 'overview' && (
                        <AdminDashboardOverview
                            users={users}
                            polls={polls}
                            advisorApps={advisorApps}
                            moderationLogs={moderationLogs}
                        />
                    )}

                    {selectedTab === 'users' && (
                        <UserManagement
                            users={users}
                            currentUser={currentUser}
                            onUserUpdated={loadAllUsers}
                        />
                    )}

                    {selectedTab === 'moderation' && (
                        <ContentModeration
                            polls={polls}
                            onPollUpdated={loadPolls}
                            currentUser={currentUser}
                        />
                    )}

                    {/* Reuse ContentModeration for 'Polls' tab for now, or keep legacy if preferred. 
                        Merging into ContentModeration is cleaner. */}
                    {selectedTab === 'polls' && (
                        <ContentModeration
                            polls={polls}
                            onPollUpdated={loadPolls}
                        />
                    )}

                    {selectedTab === 'settings' && (
                        <PlatformSettings settings={platformSettings} onSettingsUpdated={loadSettings} />
                    )}

                    {selectedTab === 'advisors' && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
                            <BookUser className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Advisor Management</h3>
                            <p className="text-slate-500 mb-4">This section is being upgraded. Please use User Management for basic role changes.</p>
                            {/* You can re-integrate the specific Advisor card usage from the original file here if needed */}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
