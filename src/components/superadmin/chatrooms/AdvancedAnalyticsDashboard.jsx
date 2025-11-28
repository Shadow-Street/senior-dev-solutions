import React, { useState, useEffect } from 'react';
import { Message, ChatRoom, User, ChatRoomParticipant, Poll, PollVote } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award,
  Target,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

export default function AdvancedAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days'); // 7days, 30days, 90days
  const [analytics, setAnalytics] = useState({
    peakHours: [],
    userEngagement: [],
    messageDistribution: [],
    roomPerformance: [],
    sentimentAnalysis: {},
    topContributors: [],
    retentionMetrics: {},
    growthTrends: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const daysBack = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      const [messages, rooms, users, participants, polls, votes] = await Promise.all([
        Message.list('-created_date', 10000),
        ChatRoom.list(),
        User.list(),
        ChatRoomParticipant.list('-last_seen_at', 1000),
        Poll.list(),
        PollVote.list()
      ]);

      // Filter messages by date range
      const filteredMessages = messages.filter(m => 
        new Date(m.created_date) >= startDate
      );

      // Calculate peak hours
      const peakHours = calculatePeakHours(filteredMessages);

      // Calculate user engagement
      const userEngagement = calculateUserEngagement(filteredMessages, participants, users);

      // Calculate message distribution by room
      const messageDistribution = calculateMessageDistribution(filteredMessages, rooms);

      // Calculate room performance
      const roomPerformance = calculateRoomPerformance(filteredMessages, participants, rooms);

      // Sentiment analysis
      const sentimentAnalysis = calculateSentimentAnalysis(filteredMessages, polls, votes);

      // Top contributors
      const topContributors = calculateTopContributors(filteredMessages, users);

      // Retention metrics
      const retentionMetrics = calculateRetentionMetrics(participants, users);

      // Growth trends
      const growthTrends = calculateGrowthTrends(filteredMessages, participants, daysBack);

      setAnalytics({
        peakHours,
        userEngagement,
        messageDistribution,
        roomPerformance,
        sentimentAnalysis,
        topContributors,
        retentionMetrics,
        growthTrends
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePeakHours = (messages) => {
    const hourCounts = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      messages: 0,
      users: new Set()
    }));

    messages.forEach(msg => {
      const hour = new Date(msg.created_date).getHours();
      hourCounts[hour].messages++;
      if (msg.user_id) {
        hourCounts[hour].users.add(msg.user_id);
      }
    });

    return hourCounts.map(h => ({
      ...h,
      users: h.users.size
    }));
  };

  const calculateUserEngagement = (messages, participants, users) => {
    const userStats = {};

    messages.forEach(msg => {
      if (!msg.user_id) return;
      if (!userStats[msg.user_id]) {
        userStats[msg.user_id] = {
          messageCount: 0,
          rooms: new Set(),
          lastActive: msg.created_date
        };
      }
      userStats[msg.user_id].messageCount++;
      if (msg.chat_room_id) {
        userStats[msg.user_id].rooms.add(msg.chat_room_id);
      }
    });

    const engagementLevels = {
      'Very Active (50+ messages)': 0,
      'Active (20-49 messages)': 0,
      'Moderate (10-19 messages)': 0,
      'Low (1-9 messages)': 0
    };

    Object.values(userStats).forEach(stat => {
      if (stat.messageCount >= 50) engagementLevels['Very Active (50+ messages)']++;
      else if (stat.messageCount >= 20) engagementLevels['Active (20-49 messages)']++;
      else if (stat.messageCount >= 10) engagementLevels['Moderate (10-19 messages)']++;
      else engagementLevels['Low (1-9 messages)']++;
    });

    return Object.entries(engagementLevels).map(([name, value]) => ({ name, value }));
  };

  const calculateMessageDistribution = (messages, rooms) => {
    const roomMessageCounts = {};

    messages.forEach(msg => {
      if (!msg.chat_room_id) return;
      roomMessageCounts[msg.chat_room_id] = (roomMessageCounts[msg.chat_room_id] || 0) + 1;
    });

    const roomsMap = new Map(rooms.map(r => [r.id, r]));

    return Object.entries(roomMessageCounts)
      .map(([roomId, count]) => ({
        name: roomsMap.get(roomId)?.name || 'Unknown Room',
        value: count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const calculateRoomPerformance = (messages, participants, rooms) => {
    const roomStats = {};

    rooms.forEach(room => {
      roomStats[room.id] = {
        name: room.name,
        type: room.room_type,
        messages: 0,
        participants: 0,
        avgMessagesPerUser: 0,
        engagementScore: 0
      };
    });

    messages.forEach(msg => {
      if (msg.chat_room_id && roomStats[msg.chat_room_id]) {
        roomStats[msg.chat_room_id].messages++;
      }
    });

    participants.forEach(p => {
      if (p.chat_room_id && roomStats[p.chat_room_id]) {
        roomStats[p.chat_room_id].participants++;
      }
    });

    return Object.values(roomStats)
      .map(stat => ({
        ...stat,
        avgMessagesPerUser: stat.participants > 0 ? (stat.messages / stat.participants).toFixed(1) : 0,
        engagementScore: Math.round((stat.messages * 0.7 + stat.participants * 0.3) / 10)
      }))
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);
  };

  const calculateSentimentAnalysis = (messages, polls, votes) => {
    // Simple sentiment based on poll votes
    const bullishCount = votes.filter(v => ['buy', 'bullish', 'yes'].includes(v.vote)).length;
    const bearishCount = votes.filter(v => ['sell', 'bearish', 'no'].includes(v.vote)).length;
    const neutralCount = votes.filter(v => ['hold', 'neutral'].includes(v.vote)).length;

    const total = bullishCount + bearishCount + neutralCount;

    return {
      bullish: total > 0 ? Math.round((bullishCount / total) * 100) : 33,
      bearish: total > 0 ? Math.round((bearishCount / total) * 100) : 33,
      neutral: total > 0 ? Math.round((neutralCount / total) * 100) : 34,
      totalPolls: polls.length,
      totalVotes: votes.length
    };
  };

  const calculateTopContributors = (messages, users) => {
    const userMessageCount = {};

    messages.forEach(msg => {
      if (msg.user_id) {
        userMessageCount[msg.user_id] = (userMessageCount[msg.user_id] || 0) + 1;
      }
    });

    const usersMap = new Map(users.map(u => [u.id, u]));

    return Object.entries(userMessageCount)
      .map(([userId, count]) => ({
        userId,
        user: usersMap.get(userId),
        messageCount: count,
        name: usersMap.get(userId)?.display_name || 'Unknown User',
        email: usersMap.get(userId)?.email
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);
  };

  const calculateRetentionMetrics = (participants, users) => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const activeThisWeek = participants.filter(p => 
      p.last_seen_at && new Date(p.last_seen_at).getTime() > weekAgo
    ).length;

    const activeThisMonth = participants.filter(p => 
      p.last_seen_at && new Date(p.last_seen_at).getTime() > monthAgo
    ).length;

    const totalUsers = new Set(participants.map(p => p.user_id)).size;

    return {
      weeklyRetention: totalUsers > 0 ? Math.round((activeThisWeek / totalUsers) * 100) : 0,
      monthlyRetention: totalUsers > 0 ? Math.round((activeThisMonth / totalUsers) * 100) : 0,
      totalActiveUsers: totalUsers,
      churnRate: totalUsers > 0 ? Math.round(((totalUsers - activeThisMonth) / totalUsers) * 100) : 0
    };
  };

  const calculateGrowthTrends = (messages, participants, daysBack) => {
    const trends = [];
    const interval = Math.max(1, Math.floor(daysBack / 10)); // 10 data points

    for (let i = 0; i < daysBack; i += interval) {
      const date = new Date();
      date.setDate(date.getDate() - (daysBack - i));
      const dayStart = new Date(date).setHours(0, 0, 0, 0);
      const dayEnd = new Date(date).setHours(23, 59, 59, 999);

      const dayMessages = messages.filter(m => {
        const msgTime = new Date(m.created_date).getTime();
        return msgTime >= dayStart && msgTime <= dayEnd;
      });

      const dayParticipants = participants.filter(p => {
        const joinTime = new Date(p.joined_at).getTime();
        return joinTime >= dayStart && joinTime <= dayEnd;
      });

      trends.push({
        date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        messages: dayMessages.length,
        newUsers: dayParticipants.length,
        activeUsers: new Set(dayMessages.map(m => m.user_id).filter(Boolean)).size
      });
    }

    return trends;
  };

  const exportAnalytics = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      dateRange,
      ...analytics
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatroom-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Advanced Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant={dateRange === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('7days')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('30days')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === '90days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('90days')}
              >
                Last 90 Days
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportAnalytics}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Retention & Sentiment */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Weekly Retention</p>
                <p className="text-3xl font-bold">{analytics.retentionMetrics.weeklyRetention}%</p>
              </div>
              <Target className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Monthly Retention</p>
                <p className="text-3xl font-bold">{analytics.retentionMetrics.monthlyRetention}%</p>
              </div>
              <Calendar className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Bullish Sentiment</p>
                <p className="text-3xl font-bold">{analytics.sentimentAnalysis.bullish}%</p>
              </div>
              <TrendingUp className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Churn Rate</p>
                <p className="text-3xl font-bold">{analytics.retentionMetrics.churnRate}%</p>
              </div>
              <Activity className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Peak Activity Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="messages" fill="#3B82F6" name="Messages" />
              <Bar yAxisId="right" dataKey="users" fill="#8B5CF6" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Growth Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.growthTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="messages" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Messages" />
              <Area type="monotone" dataKey="activeUsers" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Active Users" />
              <Area type="monotone" dataKey="newUsers" stackId="3" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              User Engagement Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.userEngagement}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.userEngagement.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Messages by Room (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.messageDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Room Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Room Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-700 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Room Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Messages</th>
                  <th className="px-4 py-3 text-right">Participants</th>
                  <th className="px-4 py-3 text-right">Avg Msgs/User</th>
                  <th className="px-4 py-3 text-right">Engagement Score</th>
                </tr>
              </thead>
              <tbody>
                {analytics.roomPerformance.map((room, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{room.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{room.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{room.messages}</td>
                    <td className="px-4 py-3 text-right">{room.participants}</td>
                    <td className="px-4 py-3 text-right">{room.avgMessagesPerUser}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${Math.min(room.engagementScore * 10, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{room.engagementScore}/10</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Top Contributors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.topContributors.map((contributor, index) => (
              <div key={contributor.userId} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold">
                  #{index + 1}
                </div>
                <img
                  src={contributor.user?.profile_image_url || `https://avatar.vercel.sh/${contributor.email}.png`}
                  alt={contributor.name}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{contributor.name}</p>
                  <p className="text-xs text-slate-500">{contributor.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{contributor.messageCount}</p>
                  <p className="text-xs text-slate-500">messages</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}