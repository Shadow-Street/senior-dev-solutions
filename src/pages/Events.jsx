import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Crown,
  List,
  Filter,
  Star,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/context/AuthContext';
import { Event } from '@/lib/apiClient';

import EventCard from '../components/events/EventCard';
import EventDetailsModal from '../components/events/EventDetailsModal';
import TicketPurchaseModal from '../components/events/TicketPurchaseModal';
import CreateEventModal from '../components/events/CreateEventModal';
import FeaturedEventsSection from '../components/events/FeaturedEventsSection';
import EventCalendarView from '../components/events/EventCalendarView';

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showTicketPurchase, setShowTicketPurchase] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('date');
  const [minRating, setMinRating] = useState(0);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const data = await Event.list('event_date', 100);
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const featuredEvents = events.filter(event =>
    event.is_featured &&
    ['approved', 'scheduled'].includes(event.status) &&
    new Date(event.event_date) > new Date()
  ).slice(0, 6);

  const filteredEvents = React.useMemo(() => {
    // Filter out canceled or rejected events unless user is admin
    let filtered = events.filter(event =>
      ['approved', 'scheduled', 'completed'].includes(event.status) ||
      (user?.role === 'admin' || user?.id === event.organizer_id)
    );

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (eventTypeFilter !== 'all') {
      if (eventTypeFilter === 'free') {
        filtered = filtered.filter(event => !event.is_premium || (event.ticket_price || 0) === 0);
      } else if (eventTypeFilter === 'premium') {
        filtered = filtered.filter(event => event.is_premium && (event.ticket_price || 0) > 0);
      }
    }

    if (minRating > 0) {
      filtered = filtered.filter(event =>
        (event.average_rating || 0) >= minRating
      );
    }

    const now = new Date();
    if (statusFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.event_date) > now);
    } else if (statusFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.event_date) < now || event.status === 'completed');
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.event_date).getTime();
      const dateB = new Date(b.event_date).getTime();
      return statusFilter === 'past' ? dateB - dateA : dateA - dateB;
    });
  }, [events, searchTerm, statusFilter, eventTypeFilter, minRating, sortBy, user]);

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleTicketPurchase = (event) => {
    if (!user) {
      toast.error("Please login to purchase tickets");
      return;
    }
    setSelectedEvent(event);
    setShowTicketPurchase(true);
  };

  const handleUpgradePremium = () => {
    window.location.href = createPageUrl('Subscription');
  };

  const handleCreateEvent = () => {
    if (!user) {
      toast.error("Please login to create an event");
      return;
    }
    setShowCreateEvent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Trading Events</h1>
              <p className="text-blue-100 text-lg">
                Join exclusive workshops, webinars, and trading sessions from market experts
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <Button
                onClick={handleCreateEvent}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <FeaturedEventsSection
          featuredEvents={featuredEvents}
          user={user}
          userAttendance={[]}
          userTickets={[]}
          onViewDetails={handleViewDetails}
          onTicketPurchase={handleTicketPurchase}
          onUpgradePremium={handleUpgradePremium}
        />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[180px] h-12">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="free">Free Events</SelectItem>
              <SelectItem value="premium">Premium Events</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-12 px-6 rounded-xl ${viewMode === 'list'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white text-gray-700'
                }`}
            >
              <List className="w-4 h-4" />
            </Button>

            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`h-12 px-6 rounded-xl ${viewMode === 'calendar'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white text-gray-700'
                }`}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <EventCalendarView
            events={filteredEvents}
            user={user}
            onViewDetails={handleViewDetails}
            onTicketPurchase={handleTicketPurchase}
            onUpgradePremium={handleUpgradePremium}
          />
        ) : (
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 bg-transparent gap-2">
              <TabsTrigger value="upcoming" className="rounded-xl">
                Upcoming Events
              </TabsTrigger>
              <TabsTrigger value="past" className="rounded-xl">
                Past Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-6">
              {filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      user={user}
                      userAccess={{ canAccess: true, reason: 'demo' }}
                      userTickets={[]}
                      onViewDetails={handleViewDetails}
                      onTicketPurchase={handleTicketPurchase}
                      onUpgradePremium={handleUpgradePremium}
                      onUpdate={() => { }}
                      isLocked={false}
                    />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                    <p className="text-gray-500">Try adjusting your filters</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {showEventDetails && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          user={user}
          userAccess={{ canAccess: true, reason: 'demo' }}
          onClose={() => setShowEventDetails(false)}
          onTicketPurchase={handleTicketPurchase}
          onUpgradePremium={handleUpgradePremium}
          onUpdate={() => { }}
        />
      )}

      {showTicketPurchase && selectedEvent && (
        <TicketPurchaseModal
          event={selectedEvent}
          user={user}
          onClose={() => setShowTicketPurchase(false)}
          onSuccess={() => { }}
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          user={user}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={() => {
            fetchEvents();
            setShowCreateEvent(false);
          }}
        />
      )}
    </div>
  );
}