
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
  Eye,
  MapPin,
  Crown,
  AlertTriangle,
  QrCode, // Add QrCode import
  Ticket, // Add Ticket import
  Star, // Add Star import
  Mail // Add Mail import
} from 'lucide-react';
import { format } from 'date-fns';
import EventFilters from './EventFilters';
import EventCapacityManager from './EventCapacityManager';
// The entity imports are no longer needed here as the data is passed as props
// import { EventCheckIn, EventPromoCode, EventFeedback } from '@/api/entities'; 

export default function EventsOverview({
  events,
  tickets,
  commissionTracking,
  attendees,
  onViewDetails,
  selectedEventIds,
  onSelectEvent,
  onSelectAll,
  onCancelEvent,
  selectedEvent,
  onUpdate,
  refreshData,
  checkIns = [], // Now received as a prop
  promoCodes = [], // Now received as a prop
  feedbacks = [] // Now received as a prop
}) {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    organizer: 'all',
    dateFrom: null,
    dateTo: null,
    isPremium: 'all',
    priceMin: '',
    priceMax: '',
    capacity: 'all'
  });

  // Removed local state for checkIns, promoCodes, feedbacks as they are now passed as props

  // Removed loadEnhancedData function as the data is now passed as props
  // Removed useEffect to trigger data loading as the data is now passed as props

  // Extract unique organizers
  const organizers = useMemo(() => {
    const uniqueOrganizers = new Map();
    events.forEach(event => {
      if (event.organizer_id && event.organizer_name) {
        uniqueOrganizers.set(event.organizer_id, {
          id: event.organizer_id,
          name: event.organizer_name
        });
      }
    });
    return Array.from(uniqueOrganizers.values());
  }, [events]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          event.title?.toLowerCase().includes(searchLower) ||
          event.organizer_name?.toLowerCase().includes(searchLower) ||
          event.location?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && event.status !== filters.status) {
        return false;
      }

      // Organizer filter
      if (filters.organizer !== 'all' && event.organizer_id !== filters.organizer) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const eventDate = new Date(event.event_date);
        const fromDate = new Date(filters.dateFrom);
        if (eventDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const eventDate = new Date(event.event_date);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (eventDate > toDate) return false;
      }

      // Premium (is_featured) filter
      if (filters.isPremium !== 'all') {
        const isPremium = filters.isPremium === 'true'; // 'true' or 'false' from select option
        if (event.is_featured !== isPremium) return false;
      }

      // Price range filter
      const eventTicketPrice = event.ticket_price || 0; // Assume 0 if price not defined
      if (filters.priceMin && eventTicketPrice < parseFloat(filters.priceMin)) {
        return false;
      }
      if (filters.priceMax && eventTicketPrice > parseFloat(filters.priceMax)) {
        return false;
      }

      // Capacity filter
      if (filters.capacity !== 'all') {
        const capacity = event.capacity; // null/undefined for 'Unlimited'
        if (filters.capacity === 'unlimited' && (capacity !== null && capacity !== undefined && capacity !== 0)) return false; // If filter is 'unlimited', exclude events with defined capacity
        if (filters.capacity === 'small' && (capacity === null || capacity === undefined || capacity === 0 || capacity > 50)) return false;
        if (filters.capacity === 'medium' && (capacity === null || capacity === undefined || capacity === 0 || capacity <= 50 || capacity > 200)) return false;
        if (filters.capacity === 'large' && (capacity === null || capacity === undefined || capacity === 0 || capacity <= 200 || capacity > 500)) return false;
        if (filters.capacity === 'xlarge' && (capacity === null || capacity === undefined || capacity === 0 || capacity <= 500)) return false;
      }

      return true;
    });
  }, [events, filters]);

  const stats = useMemo(() => {
    return {
      total: filteredEvents.length,
      pending: filteredEvents.filter(e => e.status === 'pending_approval').length,
      approved: filteredEvents.filter(e => e.status === 'approved').length,
      scheduled: filteredEvents.filter(e => e.status === 'scheduled').length,
      completed: filteredEvents.filter(e => e.status === 'completed').length,
      cancelled: filteredEvents.filter(e => e.status === 'cancelled').length,
      rejected: filteredEvents.filter(e => e.status === 'rejected').length,
      totalRevenue: commissionTracking
        .filter(ct => filteredEvents.some(e => e.id === ct.event_id))
        .reduce((sum, ct) => sum + (ct.gross_revenue || 0), 0),
      totalTickets: tickets.filter(t => filteredEvents.some(e => e.id === t.event_id)).length,
      totalAttendees: attendees.filter(a => filteredEvents.some(e => e.id === a.event_id)).length
    };
  }, [filteredEvents, commissionTracking, tickets, attendees]);

  const enhancedStats = useMemo(() => {
    const totalCheckIns = checkIns.length;
    const totalPromoCodes = promoCodes.length;
    const activePromoCodes = promoCodes.filter(p => p.is_active).length;
    const totalFeedbacks = feedbacks.length;
    const avgFeedbackRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;
    // Changed checkInRate calculation as per outline
    const checkInRate = tickets.length > 0 ? (totalCheckIns / tickets.length) * 100 : 0;

    return {
      totalCheckIns,
      checkInRate,
      totalPromoCodes,
      activePromoCodes,
      totalFeedbacks,
      avgFeedbackRating
    };
  }, [checkIns, promoCodes, feedbacks, tickets]); // Updated dependencies

  const upcomingEvents = filteredEvents
    .filter(e => e.status === 'scheduled' && new Date(e.event_date) > new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);

  const recentEvents = filteredEvents
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  const statusConfig = {
    pending_approval: { color: 'bg-hold-muted text-hold-muted-foreground', icon: Clock, label: 'Pending' },
    approved: { color: 'bg-premium-muted text-protocall-blue', icon: CheckCircle, label: 'Approved' },
    scheduled: { color: 'bg-buy-muted text-buy-muted-foreground', icon: Calendar, label: 'Scheduled' },
    completed: { color: 'bg-premium-muted text-protocall-premium-text', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'bg-surface-2 text-foreground', icon: XCircle, label: 'Cancelled' },
    rejected: { color: 'bg-sell-muted text-sell-muted-foreground', icon: XCircle, label: 'Rejected' }
  };

  const allSelected = recentEvents.length > 0 && recentEvents.every(e => selectedEventIds.includes(e.id));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <EventFilters onFilterChange={setFilters} organizers={organizers} currentFilters={filters} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-protocall-blue">Total Events</p>
                <p className="text-3xl font-bold text-protocall-blue">{stats.total}</p>
              </div>
              <div className="p-3 bg-premium-muted rounded-xl">
                <Calendar className="w-6 h-6 text-protocall-blue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-gradient-to-br from-surface-2 to-hold-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hold-muted-foreground">Pending Approval</p>
                <p className="text-3xl font-bold text-hold-muted-foreground">{stats.pending}</p>
              </div>
              <div className="p-3 bg-hold-muted rounded-xl">
                <Clock className="w-6 h-6 text-hold-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-gradient-to-br from-surface-2 to-buy-muted">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-buy-muted-foreground">Scheduled</p>
                <p className="text-3xl font-bold text-buy-muted-foreground">{stats.scheduled}</p>
              </div>
              <div className="p-3 bg-buy-muted rounded-xl">
                <CheckCircle className="w-6 h-6 text-buy-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-surface-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-protocall-premium-text">Total Revenue</p>
                <p className="text-3xl font-bold text-protocall-premium-text">₹{(stats.totalRevenue / 1000).toFixed(1)}k</p>
              </div>
              <div className="p-3 bg-premium-muted rounded-xl">
                <DollarSign className="w-6 h-6 text-protocall-premium-text" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Enhanced Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-subtle">Check-Ins</p>
              <p className="text-3xl font-bold text-foreground">{enhancedStats.totalCheckIns}</p>
              <p className="text-sm text-buy-muted-foreground">{enhancedStats.checkInRate.toFixed(1)}% rate</p>
            </div>
            <div className="p-3 bg-buy-muted rounded-xl">
              <QrCode className="w-6 h-6 text-buy-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-subtle">Promo Codes</p>
              <p className="text-3xl font-bold text-foreground">{enhancedStats.totalPromoCodes}</p>
              <p className="text-sm text-protocall-premium-text">{enhancedStats.activePromoCodes} active</p>
            </div>
            <div className="p-3 bg-premium-muted rounded-xl">
              <Ticket className="w-6 h-6 text-protocall-premium-text" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-subtle">Feedback Received</p>
              <p className="text-3xl font-bold text-foreground">{enhancedStats.totalFeedbacks}</p>
              <p className="text-sm text-hold-muted-foreground">{enhancedStats.avgFeedbackRating.toFixed(1)} ⭐ avg</p>
            </div>
            <div className="p-3 bg-hold-muted rounded-xl">
              <Star className="w-6 h-6 text-hold-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-0 bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-subtle">Automation</p>
              <p className="text-3xl font-bold text-foreground">Active</p>
              <p className="text-sm text-protocall-blue">Reminders & Feedback</p>
            </div>
            <div className="p-3 bg-premium-muted rounded-xl">
              <Mail className="w-6 h-6 text-protocall-blue" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-buy-muted-foreground" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming events scheduled</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => {
                const config = statusConfig[event.status];
                const Icon = config?.icon || Calendar;

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-surface-2 to-white rounded-xl border border-border hover:border-protocall-premium-light hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-premium-muted rounded-lg">
                        <Calendar className="w-5 h-5 text-protocall-blue" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{event.title}</h4>
                          {event.is_featured && (
                            <Crown className="w-4 h-4 text-hold" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-subtle">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {event.event_date && !isNaN(new Date(event.event_date).getTime())
                              ? format(new Date(event.event_date), 'MMM dd, yyyy HH:mm')
                              : 'TBD'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location?.substring(0, 30)}...
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.capacity || 'Unlimited'} capacity
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${config.color} border-0`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(event)}
                        className="bg-transparent border-2 border-border hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-protocall-blue transition-all duration-300"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add this section before the events table */}
      {selectedEvent && (
        <div className="mb-6">
          <EventCapacityManager
            event={selectedEvent}
            attendees={attendees.filter(a => a.event_id === selectedEvent.id)}
            onUpdate={onUpdate}
          />
        </div>
      )}

      {/* Recent Events Table */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-protocall-blue" />
              {filters.search || filters.status !== 'all' || filters.organizer !== 'all' || filters.dateFrom || filters.dateTo || filters.isPremium !== 'all' || filters.priceMin || filters.priceMax || filters.capacity !== 'all' ? 'Filtered Events' : 'Recent Events'}
              <Badge className="bg-surface-2 text-protocall-blue">
                {recentEvents.length}
              </Badge>
            </CardTitle>
            {recentEvents.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onSelectAll(recentEvents)}
                />
                <span className="text-sm text-subtle">Select All</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold">No events found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Select</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Event</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Organizer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Capacity</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-subtle">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map(event => {
                    const config = statusConfig[event.status];
                    const Icon = config?.icon || Calendar;
                    const isSelected = selectedEventIds.includes(event.id);

                    return (
                      <tr
                        key={event.id}
                        className={`border-b border-divider hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 transition-all duration-200 ${isSelected ? 'bg-premium-muted' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onSelectEvent(event.id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{event.title}</span>
                            {event.is_featured && (
                              <Crown className="w-4 h-4 text-hold" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-subtle">{event.organizer_name}</td>
                        <td className="py-3 px-4 text-sm text-subtle">
                          {event.event_date && !isNaN(new Date(event.event_date).getTime())
                            ? format(new Date(event.event_date), 'MMM dd, yyyy')
                            : 'TBD'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${config.color} border-0 text-xs`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-subtle">
                          {event.capacity || 'Unlimited'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetails(event)}
                              className="text-protocall-blue hover:text-protocall-blue hover:bg-premium-muted rounded-xl transition-all duration-300"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>

                            {['approved', 'scheduled'].includes(event.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCancelEvent(event)}
                                className="text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted rounded-xl transition-all duration-300"
                              >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
