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
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

import EventCard from '../components/events/EventCard';
import EventDetailsModal from '../components/events/EventDetailsModal';
import TicketPurchaseModal from '../components/events/TicketPurchaseModal';
import CreateEventModal from '../components/events/CreateEventModal';
import FeaturedEventsSection from '../components/events/FeaturedEventsSection';
import EventCalendarView from '../components/events/EventCalendarView';

// Sample events - NO DATABASE CALLS
const sampleEvents = [
  {
    id: 'sample-1',
    title: 'Intro to Stock Trading',
    description: 'Learn the basics of stock trading, market analysis, and risk management from industry experts.',
    event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
    event_time: '10:00 AM',
    location: 'Online Webinar',
    organizer_name: 'Trading Academy',
    image_url: 'https://images.unsplash.com/photo-1621379761921-2321528430b3?w=800&fit=crop',
    is_premium: false,
    ticket_price: 0,
    status: 'scheduled',
    is_featured: true,
    average_rating: 4.5,
    total_reviews: 10,
  },
  {
    id: 'sample-2',
    title: 'Advanced Options Strategies',
    description: 'Master complex options strategies for income generation and hedging in volatile markets.',
    event_date: new Date(Date.now() + 86400000 * 14).toISOString(),
    event_time: '02:00 PM',
    location: 'Virtual Classroom',
    organizer_name: 'Elite Traders',
    image_url: 'https://images.unsplash.com/photo-1579621970795-87facc2f939d?w=800&fit=crop',
    is_premium: false,
    ticket_price: 499,
    status: 'scheduled',
    is_featured: true,
    average_rating: 4.8,
    total_reviews: 25,
  },
  {
    id: 'sample-3',
    title: 'Market Analysis Masterclass',
    description: 'Deep dive into technical and fundamental analysis techniques used by professional traders.',
    event_date: new Date(Date.now() + 86400000 * 21).toISOString(),
    event_time: '11:00 AM',
    location: 'Online Workshop',
    organizer_name: 'Market Gurus',
    image_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&fit=crop',
    is_premium: false,
    ticket_price: 0,
    status: 'scheduled',
    is_featured: false,
    average_rating: 4.2,
    total_reviews: 8,
  },
];

export default function EventsPage() {
  const [events] = useState(sampleEvents);
  const user = null; // Guest mode - no authentication
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const featuredEvents = events.filter(event =>
    event.is_featured &&
    ['approved', 'scheduled'].includes(event.status) &&
    new Date(event.event_date) > new Date()
  ).slice(0, 6);

  const filteredEvents = React.useMemo(() => {
    let filtered = events.filter(event => ['approved', 'scheduled'].includes(event.status));

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
        event.average_rating >= minRating && event.total_reviews > 0
      );
    }

    const now = new Date();
    if (statusFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.event_date) > now);
    } else if (statusFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.event_date) < now || event.status === 'completed');
    }

    return filtered.sort((a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [events, searchTerm, statusFilter, eventTypeFilter, minRating, sortBy]);

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleTicketPurchase = (event) => {
    toast.info("Feature demo - ticket purchase requires login");
  };

  const handleUpgradePremium = () => {
    window.location.href = createPageUrl('Subscription');
  };

  const handleCreateEvent = () => {
    toast.info("Feature demo - event creation requires login");
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
              className={`h-12 px-6 rounded-xl ${
                viewMode === 'list'
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
              className={`h-12 px-6 rounded-xl ${
                viewMode === 'calendar'
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
                      onUpdate={() => {}}
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
          onUpdate={() => {}}
        />
      )}

      {showTicketPurchase && selectedEvent && (
        <TicketPurchaseModal
          event={selectedEvent}
          user={user}
          onClose={() => setShowTicketPurchase(false)}
          onSuccess={() => {}}
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          user={user}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}