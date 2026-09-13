import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  getUpcomingEventsCategories, 
  getTimeUntilEvent,
  getEventStatusBadge,
  sortEventsByUrgency 
} from '../events/UpcomingEventsHelper';

export default function UpcomingEventsWidget({ events }) {
  const upcomingCategories = useMemo(() => 
    getUpcomingEventsCategories(events), 
    [events]
  );

  // Get top 5 most urgent upcoming events
  const topUpcoming = useMemo(() => 
    sortEventsByUrgency(upcomingCategories.all).slice(0, 5),
    [upcomingCategories]
  );

  if (topUpcoming.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-protocall-blue" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-subtle">No upcoming events scheduled</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-protocall-blue" />
            Upcoming Events
            <Badge variant="secondary">{upcomingCategories.all.length}</Badge>
          </CardTitle>
          <Link to={createPageUrl('Events')}>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2 mt-3">
          {upcomingCategories.today.length > 0 && (
            <Badge className="bg-hold-muted text-hold-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {upcomingCategories.today.length} Today
            </Badge>
          )}
          {upcomingCategories.thisWeek.length > 0 && (
            <Badge className="bg-hold-muted text-hold-muted-foreground">
              {upcomingCategories.thisWeek.length} This Week
            </Badge>
          )}
          {upcomingCategories.featured.length > 0 && (
            <Badge className="bg-premium-muted text-premium-muted-foreground">
              <Sparkles className="w-3 h-3 mr-1" />
              {upcomingCategories.featured.length} Featured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topUpcoming.map(event => {
            const timeUntil = getTimeUntilEvent(event.event_date);
            const statusBadge = getEventStatusBadge(event);

            return (
              <Link key={event.id} to={createPageUrl('Events')}>
                <div className="p-4 border border-border rounded-lg hover:border-protocall-premium-light hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-foreground line-clamp-1">
                      {event.title}
                    </h4>
                    {event.is_featured && (
                      <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={statusBadge.color}>
                      {statusBadge.label}
                    </Badge>
                    <Badge 
                      className={`${
                        timeUntil.urgent 
                          ? 'bg-hold-muted text-hold-muted-foreground animate-pulse' 
                          : 'bg-premium-muted text-premium-muted-foreground'
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {timeUntil.label}
                    </Badge>
                    {event.is_premium && (
                      <Badge className="bg-premium text-premium-foreground">
                        Premium
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-subtle">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.event_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {event.capacity && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.attendees_count || 0}/{event.capacity}
                      </div>
                    )}
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-1 text-sm text-subtle mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}