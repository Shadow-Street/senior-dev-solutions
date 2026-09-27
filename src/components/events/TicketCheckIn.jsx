import React, { useState, useEffect } from 'react';
import { EventAttendee, EventTicket } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Search, QrCode, Users, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TicketCheckIn({ event, open, onClose, onUpdate }) {
  const [ticketId, setTicketId] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [checkedInList, setCheckedInList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadCheckInData();
    }
  }, [open, event.id]);

  const loadCheckInData = async () => {
    try {
      setIsLoading(true);
      const [attendeesData, ticketsData] = await Promise.all([
        EventAttendee.filter({ event_id: event.id }),
        EventTicket.filter({ event_id: event.id, status: 'active' })
      ]);

      setAttendees(attendeesData);
      setTickets(ticketsData);
      setCheckedInList(attendeesData.filter(a => a.confirmed));
    } catch (error) {
      console.error('Error loading check-in data:', error);
      toast.error('Failed to load check-in data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!ticketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }

    setIsChecking(true);

    try {
      // Find ticket by ID or last 8 characters
      const ticket = tickets.find(t =>
        t.id === ticketId || t.id.slice(-8).toUpperCase() === ticketId.toUpperCase()
      );

      if (!ticket) {
        toast.error('Ticket not found');
        setTicketInfo({ error: 'Ticket not found' });
        return;
      }

      if (ticket.status === 'used') {
        toast.warning('Ticket already checked in');
        setTicketInfo({ ...ticket, alreadyUsed: true });
        return;
      }

      if (ticket.status !== 'active') {
        toast.error(`Ticket status: ${ticket.status}`);
        setTicketInfo({ ...ticket, invalidStatus: true });
        return;
      }

      // Mark ticket as used
      await EventTicket.update(ticket.id, { status: 'used' });

      // Mark attendee as confirmed
      const attendee = attendees.find(a => a.user_id === ticket.user_id);
      if (attendee) {
        await EventAttendee.update(attendee.id, { confirmed: true });
      }

      toast.success('Check-in successful!');
      setTicketInfo({ ...ticket, checkedIn: true });

      // Reload data
      await loadCheckInData();
      if (onUpdate) onUpdate();

      // Clear form after 2 seconds
      setTimeout(() => {
        setTicketId('');
        setTicketInfo(null);
      }, 2000);

    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in ticket');
    } finally {
      setIsChecking(false);
    }
  };

  const handleReset = () => {
    setTicketId('');
    setTicketInfo(null);
  };

  const exportAttendanceCSV = () => {
    const headers = ['Name', 'Email', 'Ticket ID', 'Check-in Time', 'Status'];
    const rows = attendees.map(attendee => {
      const ticket = tickets.find(t => t.user_id === attendee.user_id);
      return [
        attendee.user_name || 'Unknown',
        attendee.user_email || 'N/A',
        ticket ? ticket.id.slice(-8).toUpperCase() : 'N/A',
        attendee.confirmed ? format(new Date(attendee.updated_date), 'dd/MM/yyyy HH:mm') : 'Not checked in',
        attendee.confirmed ? 'Checked In' : 'Pending'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}_attendance.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Attendance report exported');
  };

  const stats = {
    totalRSVPs: attendees.length,
    checkedIn: checkedInList.length,
    pending: attendees.length - checkedInList.length,
    rate: attendees.length > 0 ? ((checkedInList.length / attendees.length) * 100).toFixed(1) : 0
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <QrCode className="w-6 h-6 text-protocall-blue" />
            Ticket Check-In: {event.title}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Real-time Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 mx-auto mb-2 text-protocall-blue" />
                  <p className="text-2xl font-bold text-foreground">{stats.totalRSVPs}</p>
                  <p className="text-xs text-subtle">Total RSVPs</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-5 h-5 mx-auto mb-2 text-buy-muted-foreground" />
                  <p className="text-2xl font-bold text-buy-muted-foreground">{stats.checkedIn}</p>
                  <p className="text-xs text-subtle">Checked In</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-hold-muted-foreground" />
                  <p className="text-2xl font-bold text-hold-muted-foreground">{stats.pending}</p>
                  <p className="text-xs text-subtle">Pending</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <QrCode className="w-5 h-5 mx-auto mb-2 text-protocall-premium-text" />
                  <p className="text-2xl font-bold text-protocall-premium-text">{stats.rate}%</p>
                  <p className="text-xs text-subtle">Attendance Rate</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0">
                <TabsTrigger value="manual" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white rounded-xl">
                  Manual Check-In
                </TabsTrigger>
                <TabsTrigger value="scanner" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white rounded-xl">
                  QR Scanner
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white rounded-xl">
                  Attendance List
                </TabsTrigger>
              </TabsList>

              {/* Manual Check-In */}
              <TabsContent value="manual" className="space-y-4 mt-4">
                <Card className="bg-surface-2">
                  <CardContent className="p-6">
                    <label className="text-sm font-medium mb-2 block text-subtle">
                      Enter Ticket ID (last 8 characters)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., A1B2C3D4"
                        value={ticketId}
                        onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleCheckIn()}
                        className="uppercase text-lg font-mono"
                        autoFocus
                      />
                      <Button
                        onClick={handleCheckIn}
                        disabled={isChecking}
                        className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Check In
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Information Display */}
                {ticketInfo && (
                  <Card className={`${ticketInfo.error ? 'bg-sell-muted border-sell/30' :
                    ticketInfo.alreadyUsed ? 'bg-hold-muted border-hold/30' :
                      ticketInfo.invalidStatus ? 'bg-hold-muted border-hold/30' :
                        'bg-buy-muted border-buy/30'
                    }`}>
                    <CardContent className="p-6">
                      {ticketInfo.error ? (
                        <div className="flex items-center gap-2 text-sell-muted-foreground">
                          <XCircle className="w-5 h-5" />
                          <span className="font-semibold">{ticketInfo.error}</span>
                        </div>
                      ) : ticketInfo.alreadyUsed ? (
                        <div>
                          <div className="flex items-center gap-2 text-hold-muted-foreground mb-2">
                            <XCircle className="w-5 h-5" />
                            <span className="font-semibold">Already Checked In</span>
                          </div>
                          <p className="text-sm text-hold-muted-foreground">
                            Ticket ID: {ticketInfo.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      ) : ticketInfo.invalidStatus ? (
                        <div>
                          <div className="flex items-center gap-2 text-hold-muted-foreground mb-2">
                            <XCircle className="w-5 h-5" />
                            <span className="font-semibold">Invalid Ticket Status</span>
                          </div>
                          <p className="text-sm text-hold-muted-foreground">
                            Status: {ticketInfo.status}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 text-buy-muted-foreground mb-3">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-semibold">Check-In Successful!</span>
                          </div>
                          <div className="space-y-1 text-sm text-buy-muted-foreground">
                            <p>Ticket ID: {ticketInfo.id.slice(-8).toUpperCase()}</p>
                            <p>Amount Paid: ₹{ticketInfo.ticket_price?.toLocaleString()}</p>
                            <p>Purchase Date: {format(new Date(ticketInfo.purchased_date || ticketInfo.created_date), 'dd/MM/yyyy')}</p>
                            <p className="font-semibold text-buy-muted-foreground mt-2">✓ Attendee has been marked as checked in</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* QR Scanner Tab */}
              <TabsContent value="scanner" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="p-12 text-center">
                    <QrCode className="w-24 h-24 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">QR Code Scanner</h3>
                    <p className="text-subtle mb-6">
                      Scan ticket QR codes for instant check-in
                    </p>
                    <Button
                      onClick={() => toast.info('QR Scanner functionality coming soon!')}
                      className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Activate Scanner
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4">
                      Requires camera access for QR code scanning
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance List */}
              <TabsContent value="list" className="space-y-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Real-Time Attendance</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportAttendanceCSV}
                    className="border-protocall-premium-light text-protocall-blue hover:bg-premium-muted"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendees.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No attendees yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    attendees.map((attendee) => {
                      const ticket = tickets.find(t => t.user_id === attendee.user_id);
                      return (
                        <Card key={attendee.id} className={attendee.confirmed ? 'border-buy/30 bg-buy-muted' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-protocall-deep to-protocall-blue flex items-center justify-center text-white font-semibold">
                                  {(attendee.user_name || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{attendee.user_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ticket ? `Ticket: ${ticket.id.slice(-8).toUpperCase()}` : 'No ticket'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {attendee.confirmed ? (
                                  <Badge className="bg-buy-muted text-buy-muted-foreground">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Checked In
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-hold-muted-foreground border-hold/30">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}