import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  Clock,
  Star,
  CheckCircle,
  Video,
  Award,
  AlertCircle
} from 'lucide-react';
import { format, isAfter, isBefore, addHours } from 'date-fns';

export default function WorkshopCard({ workshop, educator, canAccessPremium }) {
  const [showJoinModal, setShowJoinModal] = useState(false);

  const workshopDate = new Date(workshop.scheduled_date);
  const workshopEndTime = addHours(workshopDate, workshop.duration_hours);
  const now = new Date();
  
  const isUpcoming = isAfter(workshopDate, now);
  const isLive = isAfter(now, workshopDate) && isBefore(now, workshopEndTime);
  const isCompleted = isAfter(now, workshopEndTime);

  const getStatusBadge = () => {
    if (isLive) {
      return <Badge className="bg-protocall-sell-text text-white animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full mr-1" />
        LIVE NOW
      </Badge>;
    } else if (isUpcoming) {
      return <Badge className="bg-protocall-blue text-white">
        UPCOMING
      </Badge>;
    } else {
      return <Badge className="bg-muted-foreground text-white">
        COMPLETED
      </Badge>;
    }
  };

  const handleJoin = () => {
    if (canAccessPremium) {
      if (isLive) {
        alert(`Joining live workshop: ${workshop.title}`);
      } else if (isUpcoming) {
        alert(`Registering for workshop: ${workshop.title}`);
      } else {
        alert("This workshop has ended. Check for recordings or upcoming sessions.");
      }
    } else {
      alert("Please subscribe to Premium to join workshops.");
    }
  };

  const isFull = workshop.current_enrollments >= workshop.max_participants;

  return (
    <Card className="shadow-lg border-0 bg-white flex flex-col">
      {/* Workshop Header */}
      <div className="relative bg-gradient-to-r from-protocall-deep to-protocall-blue p-4 text-white">
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-hold" />
            <span className="font-medium">{workshop.rating}</span>
          </div>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <Badge variant="outline" className="border-protocall-premium-light bg-premium-muted text-protocall-premium-text">
            LIVE WORKSHOP
          </Badge>
          <CardTitle className="text-lg leading-tight">{workshop.title}</CardTitle>
        </div>

        {/* Educator */}
        {educator && (
          <div className="flex items-center gap-2 text-sm text-subtle">
            <img
              src={educator.profile_image_url}
              alt={educator.display_name}
              className="w-6 h-6 rounded-full"
            />
            <span className="font-medium">{educator.display_name}</span>
            {educator.verified && (
              <CheckCircle className="w-4 h-4 text-positive" />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        <p className="text-sm text-subtle line-clamp-2">{workshop.description}</p>

        {/* Workshop Schedule */}
        <div className="bg-premium-muted p-3 rounded-lg">
          <div className="flex items-center gap-2 text-protocall-blue font-medium text-sm">
            <Calendar className="w-4 h-4" />
            <span>{format(workshopDate, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-protocall-blue text-sm mt-1">
            <Clock className="w-4 h-4" />
            <span>{format(workshopDate, 'h:mm a')} - {format(workshopEndTime, 'h:mm a')}</span>
          </div>
          <div className="text-xs text-protocall-blue mt-1">
            Duration: {workshop.duration_hours} hours
          </div>
        </div>

        {/* Capacity Status */}
        <div className="bg-surface-2 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-subtle">Participants:</span>
            <span className={`font-semibold ${isFull ? 'text-sell-muted-foreground' : 'text-foreground'}`}>
              {workshop.current_enrollments} / {workshop.max_participants}
            </span>
          </div>
          <div className="mt-2 bg-border rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isFull ? 'bg-sell' : 'bg-primary'
              }`}
              style={{ 
                width: `${Math.min((workshop.current_enrollments / workshop.max_participants) * 100, 100)}%` 
              }}
            />
          </div>
          {isFull && (
            <div className="flex items-center gap-1 text-xs text-sell-muted-foreground mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>Workshop is full</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto pt-4">
          <p className="text-2xl font-bold text-foreground">₹{workshop.price}</p>
          <Button 
            onClick={handleJoin}
            className={`${
              isLive 
                ? 'bg-sell hover:bg-sell animate-pulse' 
                : 'bg-gradient-to-r from-protocall-deep to-protocall-blue'
            } text-white`}
            disabled={!canAccessPremium || (isFull && !isLive)}
          >
            <Video className="w-4 h-4 mr-2" />
            {isLive ? 'Join Live' : isUpcoming ? 'Register' : 'View Recording'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}