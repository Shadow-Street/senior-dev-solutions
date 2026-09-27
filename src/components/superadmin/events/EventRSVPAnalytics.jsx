import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Download,
  Eye,
  Search,
  Calendar,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function EventRSVPAnalytics({ events, attendees, currentUser, onViewDetails, onCancelEvent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Calculate RSVP statistics
  const rsvpStats = useMemo(() => {
    const totalRSVPs = attendees.length;
    const yesCount = attendees.filter(a => a.rsvp_status === 'yes').length;
    const maybeCount = attendees.filter(a => a.rsvp_status === 'maybe').length;
    const noCount = attendees.filter(a => a.rsvp_status === 'no').length;

    return {
      total: totalRSVPs,
      yes: yesCount,
      maybe: maybeCount,
      no: noCount,
      conversionRate: totalRSVPs > 0 ? ((yesCount / totalRSVPs) * 100).toFixed(1) : 0
    };
  }, [attendees]);

  // Group attendees by event
  const eventRSVPData = useMemo(() => {
    const eventMap = new Map();
    
    events.forEach(event => {
      const eventAttendees = attendees.filter(a => a.event_id === event.id);
      const yesCount = eventAttendees.filter(a => a.rsvp_status === 'yes').length;
      const maybeCount = eventAttendees.filter(a => a.rsvp_status === 'maybe').length;
      const noCount = eventAttendees.filter(a => a.rsvp_status === 'no').length;
      const totalCount = eventAttendees.length;
      
      eventMap.set(event.id, {
        ...event,
        attendees: eventAttendees,
        rsvpCounts: {
          yes: yesCount,
          maybe: maybeCount,
          no: noCount,
          total: totalCount
        },
        conversionRate: totalCount > 0 ? ((yesCount / totalCount) * 100).toFixed(1) : 0,
        capacityUsed: event.capacity ? ((yesCount / event.capacity) * 100).toFixed(1) : null
      });
    });

    return Array.from(eventMap.values());
  }, [events, attendees]);

  // Filter events based on search term
  const filteredEvents = useMemo(() => {
    if (!searchTerm) return eventRSVPData;
    
    return eventRSVPData.filter(event =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [eventRSVPData, searchTerm]);

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const exportRSVPData = (event) => {
    try {
      const csvData = [
        ['User Name', 'RSVP Status', 'Timestamp', 'Confirmed'],
        ...event.attendees.map(attendee => [
          attendee.user_name || 'N/A',
          attendee.rsvp_status.toUpperCase(),
          new Date(attendee.created_date).toLocaleString(),
          attendee.confirmed ? 'Yes' : 'No'
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_RSVPs.csv`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('RSVP data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      {/* RSVP Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-protocall-blue" />
              <div>
                <p className="text-sm text-subtle">Total RSVPs</p>
                <p className="text-2xl font-bold text-foreground">{rsvpStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
              <div>
                <p className="text-sm text-subtle">Yes Responses</p>
                <p className="text-2xl font-bold text-buy-muted-foreground">{rsvpStats.yes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-hold-muted-foreground" />
              <div>
                <p className="text-sm text-subtle">Maybe Responses</p>
                <p className="text-2xl font-bold text-hold-muted-foreground">{rsvpStats.maybe}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-sell-muted-foreground" />
              <div>
                <p className="text-sm text-subtle">No Responses</p>
                <p className="text-2xl font-bold text-sell-muted-foreground">{rsvpStats.no}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-protocall-premium-text" />
              <div>
                <p className="text-sm text-subtle">Conversion Rate</p>
                <p className="text-2xl font-bold text-protocall-premium-text">{rsvpStats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events RSVP Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event RSVP Analytics</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th className="text-left p-3 font-semibold">Event</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-center p-3 font-semibold">Yes</th>
                  <th className="text-center p-3 font-semibold">Maybe</th>
                  <th className="text-center p-3 font-semibold">No</th>
                  <th className="text-center p-3 font-semibold">Conversion</th>
                  <th className="text-center p-3 font-semibold">Capacity</th>
                  <th className="text-right p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr key={event.id} className="border-t hover:bg-surface-2">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{event.title}</p>
                        <p className="text-xs text-muted-foreground">by {event.organizer_name}</p>
                        {event.is_premium && (
                          <Badge className="mt-1 text-xs bg-premium-muted text-protocall-premium-text">
                            Premium
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-subtle">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-buy-muted text-buy-muted-foreground">
                        {event.rsvpCounts.yes}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-hold-muted text-hold-muted-foreground">
                        {event.rsvpCounts.maybe}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-sell-muted text-sell-muted-foreground">
                        {event.rsvpCounts.no}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-medium">
                      {event.conversionRate}%
                    </td>
                    <td className="p-3 text-center">
                      {event.capacity ? (
                        <div className="text-xs">
                          {event.capacityUsed}% 
                          <br />
                          <span className="text-muted-foreground">
                            ({event.rsvpCounts.yes}/{event.capacity})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unlimited</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails ? onViewDetails(event) : openEventDetails(event)}
                          className="text-protocall-blue hover:text-protocall-blue hover:bg-premium-muted rounded-xl transition-all duration-300"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        
                        {['approved', 'scheduled'].includes(event.status) && onCancelEvent && (
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
                ))}
              </tbody>
            </table>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No events found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No events have been created yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Event RSVP Details: {selectedEvent.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Event Summary */}
              <div className="bg-surface-2 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-subtle">Total RSVPs</p>
                    <p className="text-xl font-bold">{selectedEvent.rsvpCounts.total}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-buy-muted-foreground">Yes</p>
                    <p className="text-xl font-bold text-buy-muted-foreground">{selectedEvent.rsvpCounts.yes}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-hold-muted-foreground">Maybe</p>
                    <p className="text-xl font-bold text-hold-muted-foreground">{selectedEvent.rsvpCounts.maybe}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sell-muted-foreground">No</p>
                    <p className="text-xl font-bold text-sell-muted-foreground">{selectedEvent.rsvpCounts.no}</p>
                  </div>
                </div>
              </div>

              {/* RSVP List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold">RSVP List</h4>
                  <Button
                    size="sm"
                    onClick={() => exportRSVPData(selectedEvent)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left p-3">User</th>
                        <th className="text-center p-3">RSVP</th>
                        <th className="text-center p-3">Confirmed</th>
                        <th className="text-right p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvent.attendees.map(attendee => (
                        <tr key={attendee.id} className="border-t">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-border rounded-full flex items-center justify-center text-xs font-medium">
                                {(attendee.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span>{attendee.user_name || 'Unknown User'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge 
                              className={
                                attendee.rsvp_status === 'yes' ? 'bg-buy-muted text-buy-muted-foreground' :
                                attendee.rsvp_status === 'maybe' ? 'bg-hold-muted text-hold-muted-foreground' :
                                'bg-sell-muted text-sell-muted-foreground'
                              }
                            >
                              {attendee.rsvp_status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {attendee.confirmed ? (
                              <CheckCircle className="w-4 h-4 text-buy-muted-foreground mx-auto" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-right text-subtle">
                            {new Date(attendee.created_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}