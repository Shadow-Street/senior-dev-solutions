import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, CheckCircle } from 'lucide-react';

/**
 * Component to display event capacity status
 */
export default function CapacityChecker({ event, attendeeCount }) {
  if (!event.capacity) {
    return null; // No capacity limit
  }
  
  const spotsLeft = event.capacity - attendeeCount;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 5;
  
  return (
    <div className="flex items-center gap-2">
      {isFull ? (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Sold Out
        </Badge>
      ) : isAlmostFull ? (
        <Badge variant="warning" className="bg-hold-muted text-hold-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Only {spotsLeft} spots left!
        </Badge>
      ) : (
        <Badge variant="outline" className="text-buy-muted-foreground border-buy/30 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {spotsLeft} spots available
        </Badge>
      )}
      
      <span className="text-xs text-muted-foreground">
        <Users className="w-3 h-3 inline mr-1" />
        {attendeeCount}/{event.capacity}
      </span>
    </div>
  );
}

/**
 * Helper function to check if user can register for event
 */
export const canRegisterForEvent = (event, attendeeCount) => {
  if (!event.capacity) {
    return { canRegister: true, reason: 'no_limit' };
  }
  
  if (attendeeCount >= event.capacity) {
    return { canRegister: false, reason: 'full' };
  }
  
  return { canRegister: true, reason: 'available' };
};