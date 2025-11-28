
import React, { useState, useEffect, useCallback } from 'react';
import { EventAttendee, EventTicket } from '@/api/entities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Clock,
  Crown,
  Ticket,
  Eye,
  Check,
  X,
  Clock as ClockIcon,
  Star,
  Lock // NEW IMPORT
} from 'lucide-react';
import { toast } from 'sonner';
import CapacityChecker, { canRegisterForEvent } from './CapacityChecker';
import { Link } from 'react-router-dom'; // NEW IMPORT
import { createPageUrl } from '@/utils'; // NEW IMPORT

export default function EventCard({ 
  event, 
  onRegister, // CHANGED: Replaced user-related props with onRegister
  onViewDetails, 
  isLocked = false // NEW PROP
}) {
  // REMOVED: userRSVP, localRSVP, totalAttendees, isRSVPing state hooks
  // REMOVED: userHasTicket memo
  // REMOVED: loadRSVPData useCallback
  // REMOVED: useEffect hooks for loadRSVPData, userTickets, userRSVP
  // REMOVED: handleRSVP function
  // REMOVED: isPastEvent and canUserRSVP functions

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };

  return (
    <Card className={`overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 ${
      event.is_premium 
        ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50' 
        : 'bg-white'
    } ${isLocked ? 'opacity-90' : ''}`}>
      {/* Event Image Header */}
      {event.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          {/* ✅ Lock Overlay for Premium Events */}
          {isLocked && (
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-600/70 to-transparent flex items-center justify-center z-10">
              <div className="text-center text-white">
                <Lock className="w-12 h-12 mx-auto mb-2" />
                <p className="font-bold text-lg">Premium Event</p>
                <p className="text-sm opacity-90">Upgrade to Access</p>
              </div>
            </div>
          )}

          {/* Badges Overlay on Image */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-0">
            {event.is_premium && (
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-lg animate-pulse">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}

            {event.is_premium && (event.ticket_price || 0) > 0 && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg font-bold">
                <Ticket className="w-3 h-3 mr-1" />
                ₹{event.ticket_price}
              </Badge>
            )}

            {!event.is_premium && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                Free Event
              </Badge>
            )}

            {/* Rating Badge */}
            {event.total_reviews > 0 && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-lg font-semibold">
                <Star className="w-3 h-3 mr-1 fill-white" />
                {event.average_rating.toFixed(1)} ({event.total_reviews})
              </Badge>
            )}
          </div>

          {/* REMOVED: User Status Badges */}
        </div>
      )}

      <CardHeader className="pb-3">
        {/* Badges when NO image */}
        {!event.image_url && (
          <div className="flex flex-wrap gap-2 mb-3">
            {event.is_premium && (
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-lg animate-pulse">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}

            {event.is_premium && (event.ticket_price || 0) > 0 && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg font-bold">
                <Ticket className="w-3 h-3 mr-1" />
                ₹{event.ticket_price}
              </Badge>
            )}

            {!event.is_premium && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                Free Event
              </Badge>
            )}

            {/* Rating Badge */}
            {event.total_reviews > 0 && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-lg font-semibold">
                <Star className="w-3 h-3 mr-1 fill-white" />
                {event.average_rating.toFixed(1)} ({event.total_reviews})
              </Badge>
            )}

            {/* REMOVED: userHasTicket and localRSVP badges */}
          </div>
        )}

        <h3 className={`text-xl font-bold line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors ${
          event.is_premium ? 'text-purple-900' : 'text-gray-900'
        }`}>
          {event.title}
        </h3>
        <p className={`text-sm line-clamp-2 ${
          event.is_premium ? 'text-purple-700' : 'text-gray-600'
        }`}>
          {event.description}
        </p>
      </CardHeader>
      
      <CardContent className="p-6"> {/* CHANGED: Class from space-y-4 to p-6 */}
        {/* Event Details */}
        <div className="space-y-2 text-sm">
          <div className={`flex items-center gap-2 ${
            event.is_premium ? 'text-purple-800' : 'text-gray-700'
          }`}>
            <CalendarIcon className={`w-4 h-4 ${
              event.is_premium ? 'text-purple-600' : 'text-blue-600'
            }`} />
            <span className="font-medium">{formatDate(event.event_date)}</span>
          </div>
          <div className={`flex items-center gap-2 ${
            event.is_premium ? 'text-purple-800' : 'text-gray-700'
          }`}>
            <MapPin className={`w-4 h-4 ${
              event.is_premium ? 'text-purple-600' : 'text-red-500'
            }`} />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          
          <div className={`flex items-center gap-2 ${
            event.is_premium ? 'text-purple-800' : 'text-gray-700'
          }`}>
            <Users className={`w-4 h-4 ${
              event.is_premium ? 'text-purple-600' : 'text-purple-600'
            }`} />
            <span>
              {/* REMOVED: totalAttendees.yes/maybe */} {/* Fallback to a generic phrase as totalAttendees is removed */}
              Attendees info not available
            </span>
          </div>
          
          {/* REMOVED: CapacityChecker */}
        </div>

        {/* Organizer */}
        {event.organizer_name && (
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            event.is_premium 
              ? 'bg-gradient-to-r from-purple-100 to-indigo-100' 
              : 'bg-gradient-to-r from-blue-50 to-purple-50'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              event.is_premium
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}>
              {event.organizer_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${
                event.is_premium ? 'text-purple-600' : 'text-gray-500'
              }`}>
                Organized by
              </p>
              <p className={`text-sm font-semibold truncate ${
                event.is_premium ? 'text-purple-900' : 'text-gray-900'
              }`}>
                {event.organizer_name}
              </p>
            </div>
          </div>
        )}

        {/* ✅ Enhanced Register Button */}
        {isLocked ? (
          <Link to={createPageUrl('Subscription')}>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-full mt-4">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Register
            </Button>
          </Link>
        ) : (
          <Button 
            onClick={() => onRegister(event)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-full mt-4"
          >
            Register Now
          </Button>
        )}

        {/* View Details Link */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onViewDetails(event)}
          className={`w-full font-medium rounded-full mt-2 ${ /* Added mt-2 for spacing */
            event.is_premium
              ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
              : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
          }`}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Full Details
        </Button>
      </CardContent>
    </Card>
  );
}
