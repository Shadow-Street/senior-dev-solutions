
import React, { useState, useEffect } from 'react';
import { Event, EventOrganizer, EventTicket, EventAttendee, RefundRequest, User, EventCheckIn, EventPromoCode } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Star,
  BarChart3,
  MapPin,
  Ticket,
  AlertCircle,
  CalendarPlus,
  Award,
  Target,
  Sparkles,
  TrendingDown,
  Activity,
  Wallet, // New icon import
  Copy
} from 'lucide-react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { format, isPast, isFuture, differenceInDays } from 'date-fns';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

import CreateEventModal from '../components/events/CreateEventModal';
import EditEventModal from '../components/events/EditEventModal';
import EventAttendeesModal from '../components/events/EventAttendeesModal';
import EventAnalyticsDashboard from '../components/organizer/EventAnalyticsDashboard';
import EventRefundManager from '../components/organizer/EventRefundManager';
import AdvisorLayout from '../components/layouts/AdvisorLayout';
import FinancialStatement from '../components/entity/FinancialStatement';
import PromoCodeManager from '../components/organizer/PromoCodeManager';
import RevenueForecastChart from '../components/organizer/RevenueForecastChart';
import ConversionFunnel from '../components/organizer/ConversionFunnel';


export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [financialTab, setFinancialTab] = useState('overview');

  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    cancelledEvents: 0,
    totalRevenue: 0,
    totalAttendees: 0,
    averageAttendance: 0,
    averageRating: 0,
    pendingApproval: 0,
    activeEvents: 0,
    totalTicketsSold: 0,
    conversionRate: 0,
    totalRefunds: 0,
    pendingRefunds: 0,
    mostPopularEvent: null,
    highestRevenueEvent: null
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setSelectedTab(tab);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const allowedRoles = ['advisor', 'finfluencer', 'educator', 'admin', 'super_admin'];
      const hasAccess = allowedRoles.includes(currentUser.app_role) || currentUser.roles?.includes('organizer');

      if (!hasAccess) {
        toast.error('Only advisors, finfluencers, and educators can organize events.');
        navigate(createPageUrl('Dashboard'));
        return;
      }

      const organizerProfiles = await EventOrganizer.filter({ user_id: currentUser.id });
      setOrganizerProfile(organizerProfiles[0] || null);

      const [eventsData, ticketsData, attendeesData, refundsData, checkInsData] = await Promise.all([
        Event.filter({ organizer_id: currentUser.id }, '-created_date'),
        EventTicket.list(),
        EventAttendee.list(),
        RefundRequest.filter({ transaction_type: 'event_ticket' }).catch(() => []),
        EventCheckIn.list().catch(() => [])
      ]);

      setEvents(eventsData);
      setTickets(ticketsData);
      setAttendees(attendeesData);
      setRefundRequests(refundsData);
      setCheckIns(checkInsData);

      // Calculate stats
      const organizerTickets = ticketsData.filter(t => 
        eventsData.some(e => e.id === t.event_id)
      );
      
      const organizerAttendees = attendeesData.filter(a =>
        eventsData.some(e => e.id === a.event_id)
      );

      const organizerRefunds = refundsData.filter(r =>
        organizerTickets.some(t => t.id === r.related_entity_id)
      );

      const totalRevenue = organizerTickets
        .filter(t => t.status === 'active' || t.status === 'used')
        .reduce((sum, t) => sum + (t.ticket_price || 0), 0);

      const upcomingEvents = eventsData.filter(e => 
        e.status === 'approved' && isFuture(new Date(e.event_date))
      );

      const completedEvents = eventsData.filter(e => 
        e.status === 'completed' || (e.status === 'approved' && isPast(new Date(e.event_date)))
      );

      const averageRating = eventsData.length > 0
        ? eventsData.reduce((sum, e) => sum + (e.average_rating || 0), 0) / eventsData.filter(e => e.average_rating).length
        : 0;

      const totalConfirmedAttendees = organizerAttendees.filter(a => a.rsvp_status === 'yes').length;
      const averageAttendance = eventsData.length > 0 ? totalConfirmedAttendees / eventsData.length : 0;

      const mostPopularEvent = eventsData.length > 0 
        ? eventsData.reduce((max, e) => {
            const eventAttendeesCount = organizerAttendees.filter(a => a.event_id === e.id && a.rsvp_status === 'yes').length;
            const maxAttendeesCount = organizerAttendees.filter(a => a.event_id === max.id && a.rsvp_status === 'yes').length;
            return eventAttendeesCount > maxAttendeesCount ? e : max;
          })
        : null;

      const highestRevenueEvent = eventsData.length > 0
        ? eventsData.reduce((max, e) => {
            const eventRevenue = organizerTickets.filter(t => t.event_id === e.id).reduce((sum, t) => sum + (t.ticket_price || 0), 0);
            const maxRevenue = organizerTickets.filter(t => t.event_id === max.id).reduce((sum, t) => sum + (t.ticket_price || 0), 0);
            return eventRevenue > maxRevenue ? e : max;
          })
        : null;

      const conversionRate = organizerAttendees.length > 0
        ? (organizerTickets.length / organizerAttendees.length) * 100
        : 0;

      setStats({
        totalEvents: eventsData.length,
        upcomingEvents: upcomingEvents.length,
        completedEvents: completedEvents.length,
        cancelledEvents: eventsData.filter(e => e.status === 'cancelled').length,
        pendingApproval: eventsData.filter(e => e.status === 'pending_approval').length,
        activeEvents: upcomingEvents.filter(e => e.status === 'approved').length,
        totalRevenue,
        totalAttendees: totalConfirmedAttendees,
        averageAttendance: Math.round(averageAttendance),
        averageRating: Math.round(averageRating * 10) / 10,
        totalTicketsSold: organizerTickets.length,
        conversionRate: Math.round(conversionRate),
        totalRefunds: organizerRefunds.length,
        pendingRefunds: organizerRefunds.filter(r => r.status === 'pending' || r.status === 'approved').length,
        mostPopularEvent,
        highestRevenueEvent
      });

    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      await Event.create({
        ...eventData,
        organizer_id: user.id,
        organizer_name: organizerProfile?.display_name || user?.display_name,
        status: 'pending_approval'
      });
      toast.success('Event created successfully! Awaiting admin approval.');
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const handleEditEvent = async (eventData) => {
    try {
      await Event.update(selectedEvent.id, eventData);
      toast.success('Event updated successfully!');
      setShowEditModal(false);
      setSelectedEvent(null);
      loadData();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await Event.delete(eventId);
      toast.success('Event deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleCloneEvent = async (event) => {
    if (!confirm(`Clone "${event.title}"?`)) return;
    
    try {
      const clonedEvent = {
        ...event,
        title: `${event.title} (Copy)`,
        status: 'pending_approval',
        event_date: new Date(new Date(event.event_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week later
      };
      
      delete clonedEvent.id;
      delete clonedEvent.created_date;
      delete clonedEvent.updated_date;
      delete clonedEvent.created_by;
      delete clonedEvent.average_rating;
      delete clonedEvent.total_reviews;
      
      await Event.create(clonedEvent);
      toast.success('Event cloned successfully!');
      loadData();
    } catch (error) {
      console.error('Error cloning event:', error);
      toast.error('Failed to clone event');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_approval: { color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', label: 'Pending Approval', icon: Clock },
      approved: { color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20', label: 'Approved', icon: CheckCircle },
      scheduled: { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', label: 'Scheduled', icon: Calendar },
      completed: { color: 'bg-purple-500/10 text-purple-700 border-purple-500/20', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-500/10 text-red-700 border-red-500/20', label: 'Cancelled', icon: XCircle },
      rejected: { color: 'bg-red-500/10 text-red-700 border-red-500/20', label: 'Rejected', icon: XCircle }
    };
    const { color, label, icon: Icon } = config[status] || config.pending_approval;
    return (
      <Badge className={`${color} border font-medium flex items-center gap-1.5 px-3 py-1`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Badge>
    );
  };

  const revenueChartData = events.slice(0, 6).map(event => {
    const eventTickets = tickets.filter(t => t.event_id === event.id);
    const revenue = eventTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);
    return {
      name: event.title.substring(0, 15) + '...',
      revenue,
      tickets: eventTickets.length
    };
  });

  const statusChartData = [
    { name: 'Approved', value: stats.activeEvents, color: '#10B981' },
    { name: 'Pending', value: stats.pendingApproval, color: '#F59E0B' },
    { name: 'Completed', value: stats.completedEvents, color: '#8B5CF6' },
    { name: 'Cancelled', value: stats.cancelledEvents, color: '#EF4444' }
  ];

  const attendanceData = events.slice(0, 6).map(event => {
    const eventAttendees = attendees.filter(a => a.event_id === event.id && a.rsvp_status === 'yes');
    return {
      name: event.title.substring(0, 15) + '...',
      attendees: eventAttendees.length,
      capacity: event.capacity || 100
    };
  });

  if (isLoading) {
    return (
      <AdvisorLayout activePage="organizer-overview">
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-lg font-semibold text-slate-700">Loading Event Organizer Dashboard...</p>
            <p className="text-sm text-slate-500 mt-2">Please wait while we fetch your data</p>
          </div>
        </div>
      </AdvisorLayout>
    );
  }

  return (
    <AdvisorLayout activePage={selectedTab === 'dashboard' ? 'organizer-overview' : selectedTab === 'events' ? 'organizer-events' : selectedTab === 'analytics' ? 'organizer-analytics' : selectedTab === 'financials' ? 'organizer-financials' : selectedTab === 'reviews' ? 'organizer-reviews' : 'organizer-overview'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Hero Header Section - Only show on dashboard tab */}
            {selectedTab === 'dashboard' && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-white">Event Organizer Dashboard</h1>
                        <p className="text-blue-100 mt-1">Manage your events and track performance</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-white/90">{stats.activeEvents} Active Events</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-300" />
                        <span className="text-sm text-white/90">{stats.averageRating}/5 Rating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-300" />
                        <span className="text-sm text-white/90">{stats.totalAttendees} Total Attendees</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setShowCreateModal(true)} 
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold px-8 py-6 text-base"
                  >
                    <CalendarPlus className="w-5 h-5 mr-2" />
                    Create New Event
                  </Button>
                </div>
              </div>
            )}

            {/* Stats Grid - Enhanced Design - Only show on dashboard */}
            {selectedTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue */}
                <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600 opacity-90"></div>
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +12%
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-100 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-white mb-1">₹{(stats.totalRevenue / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-emerald-200">₹{Math.round(stats.totalRevenue / (stats.totalTicketsSold || 1))}/ticket avg</p>
                    </div>
                    <Progress value={75} className="h-1.5 mt-4 bg-white/20" indicatorClassName="bg-white" />
                  </CardContent>
                </Card>

                {/* Total Attendees */}
                <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-90"></div>
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">
                        <Activity className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-100 mb-1">Total Attendees</p>
                      <p className="text-3xl font-bold text-white mb-1">{stats.totalAttendees}</p>
                      <p className="text-xs text-blue-200">{stats.averageAttendance} avg per event</p>
                    </div>
                    <Progress value={60} className="h-1.5 mt-4 bg-white/20" indicatorClassName="bg-white" />
                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-90"></div>
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-100 mb-1">Upcoming Events</p>
                      <p className="text-3xl font-bold text-white mb-1">{stats.upcomingEvents}</p>
                      <p className="text-xs text-purple-200">{stats.pendingApproval} pending approval</p>
                    </div>
                    <Progress value={40} className="h-1.5 mt-4 bg-white/20" indicatorClassName="bg-white" />
                  </CardContent>
                </Card>

                {/* Average Rating */}
                <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90"></div>
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <Star className="w-6 h-6 text-white fill-white" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">
                        <Target className="w-3 h-3 mr-1" />
                        High
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-100 mb-1">Average Rating</p>
                      <p className="text-3xl font-bold text-white mb-1">{stats.averageRating}<span className="text-xl">/5</span></p>
                      <p className="text-xs text-amber-200">From {stats.totalEvents} events</p>
                    </div>
                    <Progress value={stats.averageRating * 20} className="h-1.5 mt-4 bg-white/20" indicatorClassName="bg-white" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Content Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="hidden">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="events">My Events</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6 mt-0">
                
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Total Events</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEvents}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Completed</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.completedEvents}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Tickets Sold</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalTicketsSold}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                          <Ticket className="w-5 h-5 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Conversion</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.conversionRate}%</p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl">
                          <Target className="w-5 h-5 text-amber-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Events */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-slate-900">Recent Events</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedTab('events')}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {events.length > 0 ? (
                      <div className="space-y-4">
                        {events.slice(0, 5).map((event) => (
                          <div key={event.id} className="group p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h4 className="font-bold text-slate-900 text-lg group-hover:text-purple-600 transition-colors">{event.title}</h4>
                                  {getStatusBadge(event.status)}
                                </div>
                                <div className="flex items-center gap-6 text-sm text-slate-600">
                                  <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {format(new Date(event.event_date), 'MMM dd, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-red-500" />
                                    {event.location}
                                  </span>
                                  {event.ticket_price > 0 && (
                                    <span className="flex items-center gap-2">
                                      <Ticket className="w-4 h-4 text-green-500" />
                                      ₹{event.ticket_price}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowAttendeesModal(true);
                                  }}
                                  className="hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowEditModal(true);
                                  }}
                                  className="hover:bg-purple-50 hover:text-purple-600"
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-10 h-10 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No events created yet</h3>
                        <p className="text-slate-600 mb-6">Start organizing your first event and grow your community</p>
                        <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                          <CalendarPlus className="w-5 h-5 mr-2" />
                          Create Your First Event
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Events Tab - Professional Event Cards */}
              <TabsContent value="events" className="space-y-6 mt-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Events</h2>
                    <p className="text-sm text-slate-600 mt-1">Manage and track all your events</p>
                  </div>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg">
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </div>

                {events.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => {
                      const eventTickets = tickets.filter(t => t.event_id === event.id);
                      const eventAttendees = attendees.filter(a => a.event_id === event.id && a.rsvp_status === 'yes');
                      const eventRevenue = eventTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);
                      
                      return (
                        <Card key={event.id} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white">
                          <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"></div>
                          <CardContent className="p-0">
                            {/* Event Image/Header */}
                            <div className="relative h-40 bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 overflow-hidden">
                              {event.image_url ? (
                                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Calendar className="w-16 h-16 text-purple-300" />
                                </div>
                              )}
                              <div className="absolute top-3 right-3">
                                {getStatusBadge(event.status)}
                              </div>
                            </div>

                            <div className="p-6 space-y-4">
                              {/* Title */}
                              <h3 className="font-bold text-lg text-slate-900 line-clamp-2 group-hover:text-purple-600 transition-colors min-h-[3.5rem]">
                                {event.title}
                              </h3>

                              {/* Event Details */}
                              <div className="space-y-2.5 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">{format(new Date(event.event_date), 'MMM dd, yyyy - HH:mm')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  <span className="line-clamp-1">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Ticket className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <span>{event.ticket_price > 0 ? `₹${event.ticket_price}` : 'Free Event'}</span>
                                </div>
                              </div>

                              {/* Stats Row */}
                              <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                                <div className="text-center">
                                  <p className="text-lg font-bold text-blue-600">{eventAttendees.length}</p>
                                  <p className="text-xs text-slate-500">Attendees</p>
                                </div>
                                <div className="text-center border-x">
                                  <p className="text-lg font-bold text-green-600">{eventTickets.length}</p>
                                  <p className="text-xs text-slate-500">Tickets</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-purple-600">₹{(eventRevenue / 1000).toFixed(1)}k</p>
                                  <p className="text-xs text-slate-500">Revenue</p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-4 gap-2 pt-4">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowAttendeesModal(true);
                                  }} 
                                  className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setShowEditModal(true);
                                  }} 
                                  className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleCloneEvent(event)}
                                  className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Clone
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-0 shadow-xl">
                    <CardContent className="p-16 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">No events created yet</h3>
                      <p className="text-slate-600 mb-6">Start organizing your first event and grow your community</p>
                      <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                        <CalendarPlus className="w-5 h-5 mr-2" />
                        Create Your First Event
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-0 space-y-6">
                <EventAnalyticsDashboard 
                  events={events}
                  tickets={tickets}
                  attendees={attendees}
                  stats={stats}
                />
                
                {/* Revenue Forecast */}
                <RevenueForecastChart 
                  events={events}
                  tickets={tickets}
                  stats={stats}
                />
                
                {/* Conversion Funnel */}
                <ConversionFunnel 
                  events={events}
                  tickets={tickets}
                  attendees={attendees}
                  checkIns={checkIns}
                />
              </TabsContent>

              {/* Financials Tab - UPDATED TO MATCH ADVISOR DASHBOARD */}
              <TabsContent value="financials" className="mt-0 space-y-6">
                {/* Sub-Navigation with Full Rounded Buttons */}
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => setFinancialTab('overview')}
                    className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                      financialTab === 'overview' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 mr-2 inline-block" />
                    Financials
                  </Button>
                  <Button
                    onClick={() => setFinancialTab('payouts')}
                    className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                      financialTab === 'payouts' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                    }`}
                  >
                    <Wallet className="w-5 h-5 mr-2 inline-block" />
                    Payout Requests
                  </Button>
                  <Button
                    onClick={() => setFinancialTab('refunds')}
                    className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                      financialTab === 'refunds' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5 mr-2 inline-block" /> {/* Using TrendingDown for refunds */}
                    Refund Management
                  </Button>
                  <Button
                    onClick={() => setFinancialTab('promo-codes')}
                    className={`flex-1 px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 ${
                      financialTab === 'promo-codes' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 text-slate-700 hover:from-blue-100 hover:to-purple-100 hover:shadow-md border border-blue-200'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 mr-2 inline-block" />
                    Promo Codes
                  </Button>
                </div>

                {/* Financial Overview Tab */}
                {financialTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-slate-800">Financial Overview</h2>
                      <Button 
                        onClick={() => setFinancialTab('payouts')}
                        disabled={stats.totalRevenue <= 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Request Payout
                      </Button>
                    </div>

                    <FinancialStatement 
                      entityType="event_organizer"
                      entityId={user?.id}
                      entityName={organizerProfile?.display_name || user?.display_name || 'Event Organizer'}
                    />
                  </div>
                )}

                {/* Payout Requests Tab */}
                {financialTab === 'payouts' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-slate-800">Payout Requests</h2>
                      <Button 
                        onClick={() => toast.info('Payout request feature coming soon')}
                        disabled={stats.totalRevenue <= 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Request Payout
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <Wallet className="w-8 h-8 text-green-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-slate-600">Available Balance</p>
                              <p className="text-2xl font-bold text-slate-900">₹{(stats.totalRevenue * 0.8).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <Clock className="w-8 h-8 text-orange-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-slate-600">Pending Payouts</p>
                              <p className="text-2xl font-bold text-slate-900">₹0</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <TrendingUp className="w-8 h-8 text-blue-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-slate-600">Total Earned</p>
                              <p className="text-2xl font-bold text-slate-900">₹{(stats.totalRevenue * 0.8).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardContent className="p-8 text-center">
                        <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">No payout requests yet.</p>
                        {stats.totalRevenue > 0 && (
                          <Button onClick={() => toast.info('Payout request feature coming soon')} className="mt-4 bg-green-600 hover:bg-green-700">
                            Request Your First Payout
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Refund Management Tab */}
                {financialTab === 'refunds' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800">Refund Management</h2>
                    <EventRefundManager 
                      events={events}
                      tickets={tickets}
                      refundRequests={refundRequests}
                      organizerId={user?.id}
                      onUpdate={loadData}
                    />
                  </div>
                )}

                {/* Promo Code Management Tab */}
                {financialTab === 'promo-codes' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800">Promo Code Management</h2>
                    <PromoCodeManager
                      events={events}
                      organizerId={user?.id}
                      onUpdate={loadData}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-0 space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Event Reviews & Ratings</h2>
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-8 text-center">
                    <Star className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Event reviews feature coming soon</p>
                    <p className="text-sm text-slate-500 mt-2">Track attendee feedback and ratings for your events</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          open={showCreateModal}
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateEvent}
        />
      )}

      {showEditModal && selectedEvent && (
        <EditEventModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onSubmit={handleEditEvent}
        />
      )}

      {showAttendeesModal && selectedEvent && (
        <EventAttendeesModal
          open={showAttendeesModal}
          onClose={() => {
            setShowAttendeesModal(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
        />
      )}
    </AdvisorLayout>
  );
}
