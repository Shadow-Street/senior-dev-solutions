import React, { useState, useEffect } from 'react';
import { EventAttendee, EventTicket } from '@/lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventRSVPModal({ event, open, onClose }) {
  const [attendees, setAttendees] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadAttendees();
    }
  }, [open, event?.id]);

  const loadAttendees = async () => {
    try {
      setIsLoading(true);
      const [attendeesData, ticketsData] = await Promise.all([
        EventAttendee.filter({ event_id: event.id }),
        event.is_premium && event.ticket_price > 0
          ? EventTicket.filter({ event_id: event.id, status: 'active' })
          : Promise.resolve([])
      ]);

      setAttendees(attendeesData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast.error('Failed to load attendee data');
    } finally {
      setIsLoading(false);
    }
  };

  const rsvpCounts = {
    total: attendees.length,
    yes: attendees.filter(a => a.rsvp_status === 'yes').length,
    maybe: attendees.filter(a => a.rsvp_status === 'maybe').length,
    no: attendees.filter(a => a.rsvp_status === 'no').length,
  };

  const hasTicket = (userId) => {
    return tickets.some(t => t.user_id === userId);
  };

  const exportCSV = () => {
    const headers = ['User Name', 'Email', 'RSVP', 'Confirmed', 'Has Ticket', 'Date'];
    const rows = attendees.map(attendee => [
      attendee.user_name || 'Unknown',
      attendee.user_email || 'N/A',
      attendee.rsvp_status.toUpperCase(),
      attendee.confirmed ? 'YES' : 'NO',
      hasTicket(attendee.user_id) ? 'YES' : 'NO',
      format(new Date(attendee.created_date), 'dd/MM/yyyy')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}_attendees.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Event RSVP Details: {event.title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-subtle" />
                    <p className="text-sm font-medium text-subtle">Total RSVPs</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{rsvpCounts.total}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium text-buy-muted-foreground mb-2">Yes</p>
                  <p className="text-3xl font-bold text-buy-muted-foreground">{rsvpCounts.yes}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium text-hold-muted-foreground mb-2">Maybe</p>
                  <p className="text-3xl font-bold text-hold-muted-foreground">{rsvpCounts.maybe}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium text-sell-muted-foreground mb-2">No</p>
                  <p className="text-3xl font-bold text-sell-muted-foreground">{rsvpCounts.no}</p>
                </CardContent>
              </Card>
            </div>

            {/* Export Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">RSVP List</h3>
              <Button
                onClick={exportCSV}
                variant="outline"
                className="bg-protocall-ink text-white hover:bg-protocall-ink"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Attendees Table */}
            {attendees.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-subtle">No RSVPs yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-subtle">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-subtle">RSVP</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-subtle">Confirmed</th>
                      {event.is_premium && event.ticket_price > 0 && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-subtle">Ticket</th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-subtle">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {attendees.map((attendee) => (
                      <tr key={attendee.id} className="hover:bg-surface-2">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-protocall-blue to-protocall-grape flex items-center justify-center text-white font-semibold text-sm">
                              {(attendee.user_name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{attendee.user_name || 'Unknown User'}</p>
                              {attendee.user_email && (
                                <p className="text-xs text-muted-foreground">{attendee.user_email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            attendee.rsvp_status === 'yes' ? 'bg-buy-muted text-buy-muted-foreground' :
                              attendee.rsvp_status === 'maybe' ? 'bg-hold-muted text-hold-muted-foreground' :
                                'bg-sell-muted text-sell-muted-foreground'
                          }>
                            {attendee.rsvp_status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {attendee.confirmed ? (
                            <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
                          ) : (
                            <Clock className="w-5 h-5 text-muted-foreground" />
                          )}
                        </td>
                        {event.is_premium && event.ticket_price > 0 && (
                          <td className="px-4 py-3">
                            {hasTicket(attendee.user_id) ? (
                              <Badge className="bg-premium-muted text-protocall-premium-text">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Purchased
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                No Ticket
                              </Badge>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-subtle">
                          {format(new Date(attendee.created_date), 'dd/MM/yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}