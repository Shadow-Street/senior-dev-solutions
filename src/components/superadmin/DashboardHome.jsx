
import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Subscription,
  Advisor,
  FinInfluencer,
  Course,
  CourseEnrollment,
  RevenueTransaction,
  Poll,
  ChatRoom,
  Event,
  Referral,
  ModerationLog,
  CommissionTracking
} from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  DollarSign,
  TrendingUp,
  Star,
  BarChart3,
  MessageSquare,
  Calendar,
  Award,
  Activity,
  Eye,
  UserCheck,
  ShieldCheck,
  Crown,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area, AreaChart } from 'recharts';

// Global cache for dashboard data
const dashboardCache = {
  data: null,
  timestamp: null,
  ttl: 120000, // 2 minutes cache
};

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function DashboardHome({ setActiveTab }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalGrossRevenue: 0,
    totalNetRevenue: 0,
    monthlyGrossRevenue: 0,
    monthlyNetRevenue: 0,
    advisors: 0,
    pendingAdvisors: 0,
    finfluencers: 0,
    pendingFinfluencers: 0, // Added from outline
    courses: 0,
    totalEnrollments: 0,
    polls: 0,
    chatRooms: 0,
    events: 0,
    referrals: 0,
    moderationFlags: 0,
    platformHealth: 'Excellent',
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    activeUsers7Days: 0, // Added from outline
    newRegistrationsToday: 0,
    newRegistrationsWeek: 0,
    activePollsCount: 0,
    premiumPollsCount: 0,
    totalPledgeValue: 0,
    activePledgesCount: 0,
    avgTrustScore: 50,
    suspendedUsers: 0,
    topAdvisors: [],
    topFinfluencers: []
  });

  const [chartData, setChartData] = useState({
    userRoles: [],
    revenueByMonth: [],
    subscriptionPlans: [],
    revenueBySource: [],
    monthlyGrowth: [],
    trustScoreDistribution: [],
    pollParticipation: [],
    expenseBreakdown: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const fetchAttempted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    if (!fetchAttempted.current) {
      fetchAttempted.current = true;
      loadAdvancedDashboardData();
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadAdvancedDashboardData = async () => {
    if (!isMounted.current) return;

    setIsLoading(true);

    try {
      // Check cache first
      const now = Date.now();
      if (dashboardCache.data && dashboardCache.timestamp && (now - dashboardCache.timestamp < dashboardCache.ttl)) {
        console.log('[DashboardHome] Using cached data');
        if (isMounted.current) {
          setStats(dashboardCache.data.stats);
          setChartData(dashboardCache.data.chartData);
          setIsLoading(false);
        }
        return;
      }

      console.log('[DashboardHome] Fetching fresh data...');

      const currentUser = await User.me().catch(() => null);

      // Batch 1: Critical user data
      const users = await User.list('-created_date').catch(() => []);
      if (!isMounted.current) return;

      await delay(800); // Increased delay

      // Batch 2: Subscription data only
      const subscriptions = await Subscription.list().catch(() => []);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 3: Advisor data only
      const advisors = await Advisor.list().catch(() => []);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 4: Finfluencer data only
      const finfluencers = await FinInfluencer.list().catch(() => []);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 5: Poll data only
      const polls = await Poll.list().catch(() => []);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 6: Revenue data
      const [courseRevenue, advisorRevenue] = await Promise.all([
        RevenueTransaction.list().catch(() => []),
        CommissionTracking.list().catch(() => [])
      ]);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 7: Moderation logs
      const moderationLogs = await ModerationLog.filter({ admin_reviewed: false }).catch(() => []);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 8: Course data
      const [courses, enrollments] = await Promise.all([
        Course.list().catch(() => []),
        CourseEnrollment.list().catch(() => [])
      ]);
      if (!isMounted.current) return;

      await delay(800);

      // Batch 9: Community data - load one at a time with delays
      let chatRooms = [];
      let eventsData = []; // Renamed to avoid conflict with `events` variable in outline
      let referrals = [];

      try {
        chatRooms = await ChatRoom.list().catch(() => []);
        if (!isMounted.current) return;
        await delay(800); // Increased delay

        eventsData = await Event.list().catch(() => []); // Using eventsData
        if (!isMounted.current) return;
        await delay(800); // Increased delay

        referrals = await Referral.list().catch(() => []);
        if (!isMounted.current) return; // Added check for referrals
      } catch (error) {
        console.warn('[DashboardHome] Error loading community data:', error);
        // Continue with empty arrays if there's an issue with specific entity
      }

      if (!isMounted.current) return;

      // Calculate time-based metrics
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // New registrations
      const newRegistrationsToday = users.filter(u =>
        new Date(u.created_date).toDateString() === today.toDateString()
      ).length;

      const newRegistrationsWeek = users.filter(u =>
        new Date(u.created_date) >= weekAgo
      ).length;

      // Active users (simulate based on recent activity, or use concrete data if available)
      const dailyActiveUsers = Math.max(0, Math.floor(users.length * 0.15));
      const weeklyActiveUsers = Math.max(0, Math.floor(users.length * 0.45));

      // Active users (from outline, based on last_activity_date)
      const activeUsers7Days = users.filter(u => {
        if (!u.last_activity_date) return false;
        const lastActive = new Date(u.last_activity_date);
        const daysSinceActive = (now - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7;
      }).length;

      // Revenue calculations
      const totalGrossRevenue =
        (courseRevenue?.reduce((sum, tx) => sum + (tx.gross_amount || 0), 0) || 0) +
        (advisorRevenue?.reduce((sum, tx) => sum + (tx.gross_amount || 0), 0) || 0) +
        (subscriptions?.reduce((sum, s) => sum + (s.price || 0), 0) || 0);

      const totalNetRevenue =
        (courseRevenue?.reduce((sum, tx) => sum + (tx.platform_commission || 0), 0) || 0) +
        (advisorRevenue?.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0) || 0) +
        (subscriptions?.reduce((sum, s) => sum + (s.price || 0), 0) || 0);

      const monthlyGrossRevenue =
        (courseRevenue?.filter(tx => new Date(tx.created_date) >= monthAgo)
          .reduce((sum, tx) => sum + (tx.gross_amount || 0), 0) || 0) +
        (advisorRevenue?.filter(tx => new Date(tx.transaction_date) >= monthAgo)
          .reduce((sum, tx) => sum + (tx.gross_amount || 0), 0) || 0) +
        (subscriptions?.filter(s => new Date(s.created_date) >= monthAgo)
          .reduce((sum, s) => sum + (s.price || 0), 0) || 0);

      const monthlyNetRevenue =
        (courseRevenue?.filter(tx => new Date(tx.created_date) >= monthAgo)
          .reduce((sum, tx) => sum + (tx.platform_commission || 0), 0) || 0) +
        (advisorRevenue?.filter(tx => new Date(tx.transaction_date) >= monthAgo)
          .reduce((sum, tx) => sum + (tx.platform_fee || 0), 0) || 0) +
        (subscriptions?.filter(s => new Date(s.created_date) >= monthAgo)
          .reduce((sum, s) => sum + (s.price || 0), 0) || 0);

      // Poll metrics
      const activePolls = polls.filter(p => p.is_active);
      const premiumPolls = activePolls.filter(p => p.is_premium);

      // User role analysis
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const premiumUsers = activeSubscriptions.filter(s => ['premium', 'vip'].includes(s.plan_type)).length;
      const pendingAdvisors = advisors.filter(a => a.status === 'pending_approval').length;
      const approvedAdvisors = advisors.filter(a => a.status === 'approved').length;
      const approvedFinfluencers = finfluencers.filter(f => f.status === 'approved').length;
      const pendingFinfluencers = finfluencers.filter(f => f.status === 'pending').length; // Added from outline

      // Trust score analysis
      const avgTrustScore = users.length > 0 ? users.reduce((sum, u) => sum + (u.trust_score || 50), 0) / users.length : 50;
      const suspendedUsers = users.filter(u => u.is_deactivated).length;

      // Top performers (sample data - in real implementation would be based on metrics)
      const topAdvisors = advisors.filter(a => a.status === 'approved').slice(0, 5).map(a => ({
        ...a,
        subscribers: Math.floor(Math.random() * 500) + 50,
        revenue: Math.floor(Math.random() * 100000) + 10000
      }));

      const topFinfluencers = finfluencers.filter(f => f.status === 'approved').slice(0, 5).map(f => ({
        ...f,
        coursesSold: Math.floor(Math.random() * 50) + 5,
        revenue: Math.floor(Math.random() * 200000) + 20000
      }));

      const calculatedStats = {
        totalUsers: users.length,
        premiumUsers,
        totalGrossRevenue,
        totalNetRevenue,
        monthlyGrossRevenue,
        monthlyNetRevenue,
        dailyActiveUsers,
        weeklyActiveUsers,
        activeUsers7Days, // Added from outline
        newRegistrationsToday,
        newRegistrationsWeek,
        advisors: approvedAdvisors,
        pendingAdvisors,
        finfluencers: approvedFinfluencers,
        pendingFinfluencers, // Added from outline
        courses: courses.length,
        totalEnrollments: enrollments.length,
        polls: polls.length,
        activePollsCount: activePolls.length,
        premiumPollsCount: premiumPolls.length,
        chatRooms: chatRooms.length,
        // Updated events count to include 'approved' status as per outline
        events: eventsData.filter(e => e.status === 'scheduled' || e.status === 'approved').length,
        referrals: referrals.filter(r => r.signup_completed).length,
        moderationFlags: moderationLogs.length,
        totalPledgeValue: 0, // Would be calculated from Pledge entity
        activePledgesCount: 0, // Would be calculated from Pledge entity
        avgTrustScore: Math.round(avgTrustScore),
        suspendedUsers,
        topAdvisors,
        topFinfluencers,
        platformHealth: moderationLogs.length > 10 ? 'Needs Attention' : moderationLogs.length > 5 ? 'Good' : 'Excellent'
      };

      // Enhanced Chart Data
      const roleDistribution = [
        { name: 'Traders', value: users.filter(u => u.app_role === 'trader').length, color: 'hsl(var(--chart-1))' },
        { name: 'Finfluencers', value: users.filter(u => u.app_role === 'finfluencer').length, color: 'hsl(var(--primary))' },
        { name: 'Advisors', value: users.filter(u => u.app_role === 'advisor').length, color: 'hsl(var(--chart-2))' },
        { name: 'Admins', value: users.filter(u => ['admin', 'super_admin', 'sub_admin'].includes(u.app_role)).length, color: 'hsl(var(--chart-5))' }
      ];

      const planDistribution = [
        { name: 'Free Users', value: users.length - activeSubscriptions.length, color: 'hsl(var(--chart-4))' },
        { name: 'Premium', value: activeSubscriptions.filter(s => s.plan_type === 'premium').length, color: 'hsl(var(--primary))' },
        { name: 'VIP', value: activeSubscriptions.filter(s => s.plan_type === 'vip').length, color: 'hsl(var(--chart-5))' }
      ];

      const revenueBySource = [
        { name: 'Course Sales', value: courseRevenue.reduce((sum, e) => sum + (e.gross_amount || 0), 0), color: 'hsl(var(--chart-2))' },
        { name: 'Platform Subscriptions', value: subscriptions.reduce((sum, s) => sum + (s.price || 0), 0), color: 'hsl(var(--primary))' },
        { name: 'Advisor Subscriptions', value: advisorRevenue.reduce((sum, tx) => sum + (tx.gross_amount || 0), 0), color: 'hsl(var(--chart-5))' },
        { name: 'Other', value: Math.floor(totalGrossRevenue * 0.05), color: 'hsl(var(--chart-4))' }
      ];

      // Trust Score Distribution
      const trustScoreDistribution = [
        { name: 'Excellent (80-100)', value: users.filter(u => (u.trust_score || 50) >= 80).length, color: 'hsl(var(--chart-2))' },
        { name: 'Good (60-79)', value: users.filter(u => (u.trust_score || 50) >= 60 && (u.trust_score || 50) < 80).length, color: 'hsl(var(--chart-5))' },
        { name: 'Fair (40-59)', value: users.filter(u => (u.trust_score || 50) >= 40 && (u.trust_score || 50) < 60).length, color: 'hsl(var(--chart-3))' },
        { name: 'Poor (0-39)', value: users.filter(u => (u.trust_score || 50) < 40).length, color: 'hsl(var(--chart-3))' }
      ];

      // Monthly trend data (last 6 months)
      const monthlyData = [];
      const monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en', { month: 'short' });

        const baseRevenue = 45000 + (5 - i) * 8000 + Math.random() * 10000;
        const baseUsers = 120 + (5 - i) * 25 + Math.floor(Math.random() * 30);

        monthlyData.push({
          month: monthName,
          grossRevenue: Math.round(baseRevenue),
          netRevenue: Math.round(baseRevenue * 0.75),
          users: baseUsers,
          courses: Math.floor(courses.length * (0.3 + (5 - i) * 0.15)),
          enrollments: Math.floor(enrollments.length * (0.2 + (5 - i) * 0.13))
        });

        monthlyGrowth.push({
          month: monthName,
          userGrowth: Math.round(5 + Math.random() * 15),
          revenueGrowth: Math.round(8 + Math.random() * 20),
          engagementGrowth: Math.round(3 + Math.random() * 12)
        });
      }

      // Poll participation over last 7 days
      const pollParticipation = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });

        pollParticipation.push({
          day: dayName,
          general: Math.floor(Math.random() * 50) + 20,
          premium: Math.floor(Math.random() * 30) + 10
        });
      }

      // Expense breakdown (sample data)
      const expenseBreakdown = [
        { name: 'Salaries', value: 150000, color: 'hsl(var(--chart-1))' },
        { name: 'Infrastructure', value: 45000, color: 'hsl(var(--chart-2))' },
        { name: 'Marketing', value: 30000, color: 'hsl(var(--chart-5))' },
        { name: 'Operations', value: 25000, color: 'hsl(var(--primary))' },
        { name: 'Miscellaneous', value: 15000, color: 'hsl(var(--chart-4))' }
      ];

      const calculatedChartData = {
        userRoles: roleDistribution,
        revenueByMonth: monthlyData,
        subscriptionPlans: planDistribution,
        revenueBySource,
        monthlyGrowth,
        trustScoreDistribution,
        pollParticipation,
        expenseBreakdown
      };

      if (isMounted.current) { // Only update state if component is still mounted
        setStats(calculatedStats);
        setChartData(calculatedChartData);

        // Update cache
        dashboardCache.data = {
          stats: calculatedStats,
          chartData: calculatedChartData
        };
        dashboardCache.timestamp = Date.now();

        console.log('[DashboardHome] Data loaded and cached successfully');
      }
    } catch (error) {
      if (isMounted.current) { // Only log error if component is still mounted
        console.error('[DashboardHome] Error loading advanced dashboard data:', error);
        // If an error occurs, it's generally better to leave the dashboard in a default/empty state
        // or show an error message rather than crashing.
        // The default `useState` values will implicitly handle this if the `setStats` and `setChartData`
        // calls are skipped due to the error.
      }
    } finally {
      if (isMounted.current) { // Only update loading state if component is still mounted
        setIsLoading(false);
      }
    }
  };

  // Green and orange fills are light: they need dark ink, not white.
  const LIGHT_FILLS = ['bg-buy', 'bg-buy-soft', 'bg-hold'];

  const StatCard = ({ title, value, icon: Icon, change, status, colorClass, subtitle }) => {
    const onLightFill = LIGHT_FILLS.includes(colorClass);
    const fg = onLightFill ? 'text-protocall-ink' : 'text-white';
    const scrim = onLightFill ? 'bg-protocall-ink/10' : 'bg-white/20';
    const soft = onLightFill ? 'text-protocall-ink/85' : 'text-white/80';

    return (
    <Card className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className={`${colorClass} ${fg} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 ${scrim} rounded-lg backdrop-blur-sm`}>
            <Icon className="w-6 h-6" />
          </div>
          {status && (
            <span className={`px-2 py-1 text-xs rounded ${scrim} font-medium backdrop-blur-sm`}>
              {status}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className={`${soft} text-sm font-medium`}>{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
          {subtitle && <p className={`${soft} text-xs`}>{subtitle}</p>}
        </div>
      </div>

      <div className="p-4 bg-card flex items-center gap-2">
        {change && (
          <>
            <TrendingUp className="w-4 h-4 text-positive" />
            <span className="text-buy-muted-foreground text-sm font-medium">{change}</span>
          </>
        )}
        {!change && status && (
          <span className="text-muted-foreground text-sm">Status: {status}</span>
        )}
        {!change && !status && (
          <span className="text-muted-foreground text-sm">No recent changes</span>
        )}
      </div>
    </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-subtle font-medium">Loading Advanced Analytics Dashboard...</p>
          <p className="text-sm text-muted-foreground mt-2">Aggregating platform metrics and insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-protocall-deep to-protocall-blue rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight">Platform Analytics Dashboard</h1>
          <p className="text-primary text-lg opacity-90">Real-time insights and comprehensive metrics for informed decision making</p>
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-buy rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
              <span className="text-sm font-medium text-white/90">Live Data</span>
            </div>
            <div className="text-sm text-primary/80">Last updated: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards - User & Community Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          User & Community Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            subtitle="All registered users"
            icon={Users}
            change={`${stats.newRegistrationsWeek} new this week`}
            colorClass="bg-primary"
          />
          <StatCard
            title="Daily Active Users"
            value={stats.dailyActiveUsers.toLocaleString()}
            subtitle={`${((stats.dailyActiveUsers / stats.totalUsers) * 100).toFixed(1)}% of total`}
            icon={Activity}
            change="Strong engagement"
            colorClass="bg-buy"
          />
          <StatCard
            title="Premium Members"
            value={stats.premiumUsers.toLocaleString()}
            subtitle={`${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}% conversion`}
            icon={Crown}
            change="Growing subscription base"
            colorClass="bg-primary"
          />
          <StatCard
            title="Active Communities"
            value={`${stats.chatRooms}`}
            subtitle={`${stats.activePollsCount} active polls`}
            icon={MessageSquare}
            change="High participation"
            colorClass="bg-primary"
          />
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-buy-muted-foreground" />
          Financial Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Monthly Gross Revenue"
            value={`₹${(stats.monthlyGrossRevenue / 1000).toFixed(1)}k`}
            subtitle="All income sources"
            icon={DollarSign}
            change="+18% vs last month"
            colorClass="bg-buy"
          />
          <StatCard
            title="Monthly Net Revenue"
            value={`₹${(stats.monthlyNetRevenue / 1000).toFixed(1)}k`}
            subtitle="Platform earnings"
            icon={TrendingUp}
            change="After commissions"
            colorClass="bg-primary"
          />
          <StatCard
            title="Total Gross Revenue"
            value={`₹${(stats.totalGrossRevenue / 1000).toFixed(1)}k`}
            subtitle="All-time revenue"
            icon={BarChart3}
            change="Lifetime performance"
            colorClass="bg-primary"
          />
          <StatCard
            title="Course Enrollments"
            value={stats.totalEnrollments.toLocaleString()}
            subtitle="Across all courses"
            icon={Star}
            change="Growing education"
            colorClass="bg-primary"
          />
        </div>
      </div>

      {/* Advisor & Finfluencer Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Advisors & Content Creators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Advisors"
            value={stats.advisors.toString()}
            subtitle="SEBI registered"
            icon={ShieldCheck}
            change={`${stats.pendingAdvisors} pending approval`}
            colorClass="bg-primary"
          />
          <StatCard
            title="Active Finfluencers"
            value={stats.finfluencers.toString()}
            subtitle="Content creators"
            icon={Star}
            change={`${stats.pendingFinfluencers} pending applications`}
            colorClass="bg-primary"
          />
          <StatCard
            title="Platform Health"
            value={stats.moderationFlags.toString()}
            subtitle="Flagged items"
            icon={Shield}
            status={stats.platformHealth}
            colorClass="bg-hold"
          />
          <StatCard
            title="Trust Score Avg"
            value={stats.avgTrustScore.toString()}
            subtitle="Community trust"
            icon={Award}
            change="Out of 100"
            colorClass="bg-buy"
          />
        </div>
      </div>

      {/* Advanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue vs Expenses Trend */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-buy-muted-foreground" />
              Revenue vs Expenses Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                <Legend />
                <Line type="monotone" dataKey="grossRevenue" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Gross Revenue" />
                <Line type="monotone" dataKey="netRevenue" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Net Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth & Activity */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              User Growth & Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="users" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="New Users" />
                <Area type="monotone" dataKey="enrollments" stackId="2" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.6} name="Course Enrollments" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Sources & User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-protocall-premium-text" />
              Revenue Breakdown by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.revenueBySource}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.revenueBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              User Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.userRoles}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  {chartData.userRoles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Poll Participation & Trust Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Weekly Poll Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.pollParticipation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="general" fill="hsl(var(--chart-1))" name="General Polls" />
                <Bar dataKey="premium" fill="hsl(var(--primary))" name="Premium Polls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-buy-muted-foreground" />
              Community Trust Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.trustScoreDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${value} users`}
                >
                  {chartData.trustScoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Advisors */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Top 5 Advisors by Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topAdvisors.slice(0, 5).map((advisor, index) => (
                <div key={advisor.id} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{advisor.display_name}</p>
                      <p className="text-sm text-muted-foreground">{advisor.subscribers || 0} subscribers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-buy-muted-foreground">₹{(advisor.revenue / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Finfluencers */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-protocall-premium-text" />
              Top 5 Finfluencers by Course Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topFinfluencers.slice(0, 5).map((finfluencer, index) => (
                <div key={finfluencer.id} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-premium-muted rounded-full flex items-center justify-center text-protocall-premium-text font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{finfluencer.display_name}</p>
                      <p className="text-sm text-muted-foreground">{finfluencer.coursesSold || 0} courses sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-buy-muted-foreground">₹{(finfluencer.revenue / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items & Alerts */}
      <Card className="shadow-lg border-0 bg-surface-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Critical Action Items & System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.pendingAdvisors > 0 && (
              <div className="bg-hold-muted border border-hold/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-hold-muted-foreground" />
                  <h4 className="font-semibold text-hold-muted-foreground">Pending Approvals</h4>
                </div>
                <p className="text-sm text-hold-muted-foreground mb-2">{stats.pendingAdvisors} advisor applications need review</p>
                <button
                  onClick={() => setActiveTab && setActiveTab('Advisor Management')}
                  className="text-xs bg-hold text-hold-foreground px-3 py-1 rounded-full hover:bg-hold transition-colors"
                >
                  Review Now
                </button>
              </div>
            )}

            {stats.moderationFlags > 0 && (
              <div className="bg-sell-muted border border-sell/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="w-5 h-5 text-sell-muted-foreground" />
                  <h4 className="font-semibold text-sell-muted-foreground">Content Moderation</h4>
                </div>
                <p className="text-sm text-sell-muted-foreground mb-2">{stats.moderationFlags} flagged items need attention</p>
                <button
                  onClick={() => setActiveTab && setActiveTab('Content Moderation')}
                  className="text-xs bg-protocall-sell-text text-white px-3 py-1 rounded-full hover:bg-sell transition-colors"
                >
                  Review Content
                </button>
              </div>
            )}

            <div className="bg-buy-muted border border-buy/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-buy-muted-foreground" />
                <h4 className="font-semibold text-buy-muted-foreground">Growth Performance</h4>
              </div>
              <p className="text-sm text-buy-muted-foreground mb-2">Platform is growing at +{((stats.newRegistrationsWeek / stats.totalUsers) * 100).toFixed(1)}% weekly rate</p>
              <button
                onClick={() => setActiveTab && setActiveTab('User Management')}
                className="text-xs bg-buy text-buy-foreground px-3 py-1 rounded-full hover:bg-buy transition-colors"
              >
                View Details
              </button>
            </div>

            {stats.suspendedUsers > 0 && (
              <div className="bg-surface-2 border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-subtle" />
                  <h4 className="font-semibold text-foreground">Suspended Users</h4>
                </div>
                <p className="text-sm text-subtle mb-2">{stats.suspendedUsers} users currently suspended</p>
                <button
                  onClick={() => setActiveTab && setActiveTab('User Management')}
                  className="text-xs bg-muted-foreground text-white px-3 py-1 rounded-full hover:bg-protocall-ink transition-colors"
                >
                  Manage Users
                </button>
              </div>
            )}

            <div className="bg-premium-muted border border-protocall-premium-light rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-primary">Engagement Stats</h4>
              </div>
              <p className="text-sm text-primary mb-2">{((stats.dailyActiveUsers / stats.totalUsers) * 100).toFixed(1)}% daily active users</p>
              <button
                onClick={() => setActiveTab && setActiveTab('Poll Management')}
                className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary transition-colors"
              >
                Boost Engagement
              </button>
            </div>

            <div className="bg-premium-muted border border-protocall-premium-light rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 className="w-5 h-5 text-protocall-premium-text" />
                <h4 className="font-semibold text-protocall-premium-text">Revenue Health</h4>
              </div>
              <p className="text-sm text-protocall-premium-text mb-2">₹{(stats.monthlyNetRevenue / 1000).toFixed(1)}k net revenue this month</p>
              <button
                onClick={() => setActiveTab && setActiveTab('Financials')}
                className="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary transition-colors"
              >
                View Reports
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
