
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Target,
  Award,
  Ticket,
  Eye,
  Star,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  CalendarPlus,
  Activity
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuditLog } from '@/api/entities';

export default function EventAnalyticsDashboard({ events, tickets, attendees, stats }) {
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, [events]);

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await AuditLog.filter({}, '-created_date', 50);
      const eventLogs = logs.filter(log => 
        log.entity_type === 'Event' && 
        events.some(e => e.id === log.entity_id)
      );
      setAuditLogs(eventLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (selectedEventFilter === 'all') return events;
    return events.filter(e => e.id === selectedEventFilter);
  }, [events, selectedEventFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => filteredEvents.some(e => e.id === t.event_id));
  }, [tickets, filteredEvents]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => filteredEvents.some(e => e.id === a.event_id));
  }, [attendees, filteredEvents]);

  const analytics = useMemo(() => {
    const totalRevenue = filteredTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);
    const totalTicketsSold = filteredTickets.length;
    const totalAttendees = filteredAttendees.filter(a => a.rsvp_status === 'yes').length;
    const totalRSVPs = filteredAttendees.length;
    
    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
    const conversionRate = totalRSVPs > 0 ? (totalTicketsSold / totalRSVPs) * 100 : 0;
    
    const upcomingEvents = filteredEvents.filter(e => 
      e.status === 'approved' && new Date(e.event_date) > new Date()
    ).length;
    
    const completedEvents = filteredEvents.filter(e => 
      e.status === 'completed' || new Date(e.event_date) < new Date()
    ).length;

    const averageRating = filteredEvents.filter(e => e.average_rating).length > 0
      ? filteredEvents.reduce((sum, e) => sum + (e.average_rating || 0), 0) / filteredEvents.filter(e => e.average_rating).length
      : 0;

    const totalReviews = filteredEvents.reduce((sum, e) => sum + (e.total_reviews || 0), 0);

    const averageAttendance = filteredEvents.length > 0
      ? filteredAttendees.filter(a => a.rsvp_status === 'yes').length / filteredEvents.length
      : 0;

    const premiumEvents = filteredEvents.filter(e => e.is_premium).length;
    const freeEvents = filteredEvents.filter(e => !e.is_premium).length;

    return {
      totalRevenue,
      totalTicketsSold,
      totalAttendees,
      totalRSVPs,
      averageTicketPrice,
      conversionRate,
      upcomingEvents,
      completedEvents,
      averageRating,
      totalReviews,
      averageAttendance,
      premiumEvents,
      freeEvents
    };
  }, [filteredEvents, filteredTickets, filteredAttendees]);

  const monthlyRevenueData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTickets = filteredTickets.filter(t => {
        const ticketDate = new Date(t.purchased_date || t.created_date);
        return ticketDate >= monthStart && ticketDate <= monthEnd;
      });

      const monthEvents = filteredEvents.filter(e => {
        const eventDate = new Date(e.event_date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });

      return {
        month: format(month, 'MMM'),
        revenue: monthTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0),
        tickets: monthTickets.length,
        events: monthEvents.length
      };
    });
  }, [filteredTickets, filteredEvents]);

  const eventTypeData = [
    { name: 'Premium Events', value: analytics.premiumEvents, color: '#8B5CF6' },
    { name: 'Free Events', value: analytics.freeEvents, color: '#10B981' }
  ];

  const topEventsByRevenue = useMemo(() => {
    return filteredEvents
      .map(event => {
        const eventTickets = filteredTickets.filter(t => t.event_id === event.id);
        const revenue = eventTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);
        return { ...event, revenue, ticketsSold: eventTickets.length };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredEvents, filteredTickets]);

  const topEventsByAttendance = useMemo(() => {
    return filteredEvents
      .map(event => {
        const eventAttendees = filteredAttendees.filter(a => a.event_id === event.id && a.rsvp_status === 'yes');
        return { ...event, attendeeCount: eventAttendees.length };
      })
      .sort((a, b) => b.attendeeCount - a.attendeeCount)
      .slice(0, 5);
  }, [filteredEvents, filteredAttendees]);

  const attendanceTrend = useMemo(() => {
    return filteredEvents.slice(0, 10).map(event => {
      const eventAttendees = filteredAttendees.filter(a => a.event_id === event.id && a.rsvp_status === 'yes');
      return {
        name: event.title.substring(0, 20) + '...',
        attendees: eventAttendees.length,
        capacity: event.capacity || 100,
        fillRate: event.capacity ? (eventAttendees.length / event.capacity) * 100 : 0
      };
    });
  }, [filteredEvents, filteredAttendees]);

  const exportData = () => {
    const csvContent = [
      ['Event Title', 'Date', 'Status', 'Tickets Sold', 'Revenue', 'Attendees', 'Rating'].join(','),
      ...filteredEvents.map(e => {
        const eventTickets = filteredTickets.filter(t => t.event_id === e.id);
        const eventAttendees = filteredAttendees.filter(a => a.event_id === e.id && a.rsvp_status === 'yes');
        const revenue = eventTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);
        return [
          e.title,
          format(new Date(e.event_date), 'yyyy-MM-dd'),
          e.status,
          eventTickets.length,
          revenue,
          eventAttendees.length,
          e.average_rating || 0
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analytics & Performance</h2>
          <p className="text-sm text-slate-600 mt-1">Comprehensive insights into your event performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" className="gap-2 bg-white">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white shadow-md">
          <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            Performance Analytics
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Revenue</p>
                    <p className="text-4xl font-bold mt-2">₹{(analytics.totalRevenue / 1000).toFixed(1)}k</p>
                    <p className="text-green-100 text-xs mt-1">Avg: ₹{Math.round(analytics.averageTicketPrice)}/ticket</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Tickets Sold</p>
                    <p className="text-4xl font-bold mt-2">{analytics.totalTicketsSold}</p>
                    <p className="text-blue-100 text-xs mt-1">{analytics.totalAttendees} confirmed</p>
                  </div>
                  <Ticket className="w-12 h-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Conversion Rate</p>
                    <p className="text-4xl font-bold mt-2">{Math.round(analytics.conversionRate)}%</p>
                    <p className="text-purple-100 text-xs mt-1">RSVPs to tickets</p>
                  </div>
                  <Target className="w-12 h-12 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Avg Rating</p>
                    <p className="text-4xl font-bold mt-2">{analytics.averageRating.toFixed(1)}⭐</p>
                    <p className="text-orange-100 text-xs mt-1">{analytics.totalReviews} reviews</p>
                  </div>
                  <Star className="w-12 h-12 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Upcoming Events</p>
                    <p className="text-2xl font-bold text-slate-900">{analytics.upcomingEvents}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Completed Events</p>
                    <p className="text-2xl font-bold text-slate-900">{analytics.completedEvents}</p>
                  </div>
                  <Award className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Avg Attendance</p>
                    <p className="text-2xl font-bold text-slate-900">{Math.round(analytics.averageAttendance)}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Event Types</p>
                    <p className="text-2xl font-bold text-slate-900">{analytics.premiumEvents}P / {analytics.freeEvents}F</p>
                  </div>
                  <Ticket className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Revenue Trend (6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-blue-600" />
                  Ticket Sales Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tickets" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-600" />
                  Event Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  Attendance Fill Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attendees" fill="#8B5CF6" name="Attendees" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="capacity" fill="#E5E7EB" name="Capacity" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Top 5 Events by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {topEventsByRevenue.map((event, index) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{event.title}</p>
                          <p className="text-xs text-slate-600">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700 text-lg">₹{event.revenue.toLocaleString()}</p>
                        <p className="text-xs text-slate-600">{event.ticketsSold} tickets</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Top 5 Events by Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {topEventsByAttendance.map((event, index) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{event.title}</p>
                          <p className="text-xs text-slate-600">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-700 text-lg">{event.attendeeCount}</p>
                        <p className="text-xs text-slate-600">attendees</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="font-semibold text-slate-800">Strong Performance</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    Your conversion rate of {Math.round(analytics.conversionRate)}% is {analytics.conversionRate > 50 ? 'above' : 'below'} industry average
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="font-semibold text-slate-800">Audience Growth</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    Average {Math.round(analytics.averageAttendance)} attendees per event
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Star className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="font-semibold text-slate-800">Customer Satisfaction</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {analytics.averageRating.toFixed(1)} star rating from {analytics.totalReviews} reviews
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6 mt-6">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Event Activity & Audit Logs
                </CardTitle>
                <Badge variant="outline" className="text-slate-600">
                  {auditLogs.length} actions logged
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingLogs ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading audit logs...</p>
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {log.action.includes('CREATE') && <CalendarPlus className="w-4 h-4 text-blue-600" />}
                            {log.action.includes('UPDATE') && <Edit className="w-4 h-4 text-purple-600" />}
                            {log.action.includes('DELETE') && <Trash2 className="w-4 h-4 text-red-600" />}
                            {log.action.includes('APPROVE') && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {log.action.includes('REJECT') && <XCircle className="w-4 h-4 text-red-600" />}
                            {!['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'].some(a => log.action.includes(a)) && <Activity className="w-4 h-4 text-slate-600" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(log.created_date), 'MMM d, HH:mm')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 pl-10">
                        <span>By: {log.admin_name}</span>
                        <span>•</span>
                        <span>Entity: {log.entity_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No audit logs available yet</p>
                  <p className="text-sm text-slate-500 mt-2">Event activity will be tracked here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
