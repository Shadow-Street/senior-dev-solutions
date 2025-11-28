import React, { useState, useCallback, useEffect } from 'react';
import { EventAttendee } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Calendar, MapPin, Users, Clock, Ticket, Star, CheckCircle, Check, X, Clock as ClockIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FeaturedEventsSection({ 
  featuredEvents, 
  user,
  userAttendance = [],
  userTickets = [],
  onViewDetails, 
  onTicketPurchase, 
  onUpgradePremium 
}) {
  if (!featuredEvents || featuredEvents.length === 0) {
    return null;
  }

  const getEventAccess = (event) => {
    if (!event.is_premium || (event.ticket_price || 0) === 0) {
      return { canAccess: true, reason: 'free' };
    }
    return { canAccess: false, reason: 'needs_ticket' };
  };

  const getUserRSVP = (eventId) => {
    if (!user || !userAttendance) return null;
    return userAttendance.find(attendance => attendance.event_id === eventId);
  };

  const hasUserPurchasedTicket = (eventId) => {
    if (!user?.id || !userTickets) return false;
    return userTickets.some(ticket => 
      ticket.event_id === eventId && 
      ticket.user_id === user.id && 
      ticket.status === 'active'
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Featured Events</h2>
          <p className="text-gray-600">Don't miss these handpicked events from our community</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredEvents.map(event => {
          const isPastEvent = new Date(event.event_date) < new Date();
          const userAccess = getEventAccess(event);
          const userRSVP = getUserRSVP(event.id);
          const userHasTicket = hasUserPurchasedTicket(event.id);

          return (
            <FeaturedEventCard
              key={event.id}
              event={event}
              user={user}
              userRSVP={userRSVP}
              userHasTicket={userHasTicket}
              userAccess={userAccess}
              isPastEvent={isPastEvent}
              onViewDetails={onViewDetails}
              onTicketPurchase={onTicketPurchase}
              onUpgradePremium={onUpgradePremium}
            />
          );
        })}
      </div>
    </div>
  );
}

function FeaturedEventCard({ 
  event, 
  user, 
  userRSVP, 
  userHasTicket, 
  userAccess, 
  isPastEvent,
  onViewDetails, 
  onTicketPurchase, 
  onUpgradePremium 
}) {
  const [localRSVP, setLocalRSVP] = useState(userRSVP);
  const [isRSVPing, setIsRSVPing] = useState(false);

  useEffect(() => {
    setLocalRSVP(userRSVP);
  }, [userRSVP]);

  const handleRSVP = async (status) => {
    if (!user) {
      toast.error('Please login to RSVP');
      return;
    }

    if (event.is_premium && (event.ticket_price || 0) > 0 && !userHasTicket) {
      toast.error('Please purchase a ticket first to RSVP');
      onTicketPurchase(event);
      return;
    }

    if (event.is_premium && (event.ticket_price || 0) === 0 && !userAccess.canAccess) {
      onUpgradePremium();
      return;
    }

    setIsRSVPing(true);
    try {
      if (localRSVP) {
        await EventAttendee.update(localRSVP.id, { 
          rsvp_status: status,
          user_name: user.display_name || user.full_name,
          confirmed: false
        });
        setLocalRSVP({ ...localRSVP, rsvp_status: status });
      } else {
        const newRSVP = await EventAttendee.create({
          event_id: event.id,
          user_id: user.id,
          user_name: user.display_name || user.full_name,
          rsvp_status: status,
          confirmed: false
        });
        setLocalRSVP(newRSVP);
      }
      
      toast.success(`RSVP updated to "${status.toUpperCase()}"`);
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    } finally {
      setIsRSVPing(false);
    }
  };

  const canUserRSVP = () => {
    if (!user) return false;
    if (isPastEvent) return false;
    
    if (event.is_premium && (event.ticket_price || 0) > 0) {
      return userHasTicket;
    }
    
    if (event.is_premium && (event.ticket_price || 0) === 0) {
      return userAccess.canAccess;
    }
    
    return true;
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-purple-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="absolute top-4 right-4 z-10">
        <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-md">
          <Crown className="w-3 h-3 mr-1" />
          Featured
        </Badge>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-indigo-500 opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>

      <CardHeader className="pb-3 relative z-10">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">{event.title}</h3>
          <div className="flex flex-wrap gap-2">
            {event.is_premium && (
              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-md">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}

            {event.is_premium && (event.ticket_price || 0) > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <Ticket className="w-3 h-3 mr-1" />
                ₹{event.ticket_price}
              </Badge>
            )}

            {!event.is_premium && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Free Event
              </Badge>
            )}

            {userHasTicket && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Ticket className="w-3 h-3 mr-1" />
                Ticket Purchased
              </Badge>
            )}
            
            {localRSVP && (
              <Badge className={`${
                localRSVP.rsvp_status === 'yes' ? 'bg-green-100 text-green-800 border-green-200' :
                localRSVP.rsvp_status === 'maybe' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-red-100 text-red-800 border-red-200'
              }`}>
                <CheckCircle className="w-3 h-3 mr-1" />
                RSVP: {localRSVP.rsvp_status.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{event.description}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="font-medium">
              {format(new Date(event.event_date), 'PPP')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>{format(new Date(event.event_date), 'p')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-purple-500" />
            <span className="line-clamp-1">
              {event.location?.includes('http') ? 'Online Event' : event.location}
            </span>
          </div>
          {event.organizer_name && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 text-purple-500" />
              <span>by {event.organizer_name}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 relative z-10 space-y-3">
        {/* RSVP Buttons for Featured Events */}
        {isPastEvent ? (
          <Button disabled className="w-full rounded-full" variant="outline">
            Event Ended
          </Button>
        ) : !user ? (
          <div className="text-sm text-blue-600 text-center py-3 bg-blue-50 rounded-full font-medium">
            🔒 Login to RSVP
          </div>
        ) : !canUserRSVP() ? (
          <div className="flex gap-2">
            <Button 
              onClick={() => onViewDetails(event)}
              variant="outline" 
              className="flex-1 hover:bg-purple-50 hover:border-purple-200 rounded-full"
            >
              View Details
            </Button>
            
            {!userAccess.canAccess ? (
              userAccess.reason === 'needs_ticket' ? (
                <Button 
                  onClick={() => onTicketPurchase(event)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full"
                >
                  <Ticket className="w-4 h-4 mr-1" />
                  Buy Ticket
                </Button>
              ) : (
                <Button 
                  onClick={onUpgradePremium}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full"
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Upgrade
                </Button>
              )
            ) : (
              <Button 
                onClick={() => onViewDetails(event)}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-full"
              >
                <Star className="w-4 h-4 mr-1" />
                RSVP Now
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* RSVP Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                size="sm" 
                onClick={() => handleRSVP('yes')}
                disabled={isRSVPing}
                className={`transition-all duration-300 rounded-full ${
                  localRSVP?.rsvp_status === 'yes'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                <Check className="w-3 h-3 mr-1" />
                Yes
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleRSVP('maybe')}
                disabled={isRSVPing}
                className={`transition-all duration-300 rounded-full ${
                  localRSVP?.rsvp_status === 'maybe'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                }`}
              >
                <ClockIcon className="w-3 h-3 mr-1" />
                Maybe
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleRSVP('no')}
                disabled={isRSVPing}
                className={`transition-all duration-300 rounded-full ${
                  localRSVP?.rsvp_status === 'no'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <X className="w-3 h-3 mr-1" />
                No
              </Button>
            </div>

            {/* View Details Button */}
            <Button 
              onClick={() => onViewDetails(event)}
              variant="ghost"
              className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full"
            >
              View Full Details
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}