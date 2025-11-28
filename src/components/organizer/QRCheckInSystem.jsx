import React, { useState, useEffect } from 'react';
import { EventCheckIn, EventTicket, EventAttendee } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, XCircle, Search, Users, Clock, Scan } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function QRCheckInSystem({ event, tickets, onUpdate }) {
  const [checkIns, setCheckIns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCheckIns();
  }, [event.id]);

  const loadCheckIns = async () => {
    try {
      const checkInData = await EventCheckIn.filter({ event_id: event.id }, '-checked_in_at');
      setCheckIns(checkInData);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = (ticketId) => {
    return `EVENT_${event.id}_TICKET_${ticketId}`;
  };

  const handleManualCheckIn = async (ticket) => {
    try {
      const existingCheckIn = checkIns.find(c => c.ticket_id === ticket.id);
      
      if (existingCheckIn) {
        toast.error('Attendee already checked in!');
        return;
      }

      const checkInData = {
        event_id: event.id,
        ticket_id: ticket.id,
        user_id: ticket.user_id,
        user_name: ticket.user_name || 'Guest',
        checked_in_at: new Date().toISOString(),
        check_in_method: 'manual',
        qr_code: generateQRCode(ticket.id)
      };

      await EventCheckIn.create(checkInData);
      await EventTicket.update(ticket.id, { status: 'used' });
      
      toast.success(`${ticket.user_name || 'Attendee'} checked in successfully!`);
      loadCheckIns();
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in attendee');
    }
  };

  const handleQRScan = async () => {
    setIsScanning(true);
    const qrCode = prompt('Enter QR code or Ticket ID:');
    
    if (!qrCode) {
      setIsScanning(false);
      return;
    }

    try {
      const ticketId = qrCode.includes('TICKET_') 
        ? qrCode.split('TICKET_')[1] 
        : qrCode;
      
      const ticket = tickets.find(t => t.id === ticketId);
      
      if (!ticket) {
        toast.error('Invalid ticket!');
        setIsScanning(false);
        return;
      }

      await handleManualCheckIn(ticket);
    } catch (error) {
      toast.error('Invalid QR code');
    } finally {
      setIsScanning(false);
    }
  };

  const checkedInCount = checkIns.length;
  const totalTickets = tickets.length;
  const checkInRate = totalTickets > 0 ? (checkedInCount / totalTickets) * 100 : 0;

  const filteredTickets = tickets.filter(t => 
    t.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-2xl font-bold">{checkedInCount}</p>
            <p className="text-sm text-green-100">Checked In</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <Users className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-2xl font-bold">{totalTickets}</p>
            <p className="text-sm text-blue-100">Total Tickets</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <Clock className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-2xl font-bold">{totalTickets - checkedInCount}</p>
            <p className="text-sm text-purple-100">Pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <QrCode className="w-8 h-8 mb-2 text-white/80" />
            <p className="text-2xl font-bold">{Math.round(checkInRate)}%</p>
            <p className="text-sm text-orange-100">Check-In Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, or ticket ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={handleQRScan}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          disabled={isScanning}
        >
          <Scan className="w-4 h-4 mr-2" />
          {isScanning ? 'Scanning...' : 'Scan QR Code'}
        </Button>
      </div>

      {/* Attendee List */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle>Attendee Check-In List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTickets.map(ticket => {
              const checkedIn = checkIns.find(c => c.ticket_id === ticket.id);
              
              return (
                <div key={ticket.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{ticket.user_name || 'Guest'}</p>
                      <p className="text-sm text-slate-600">{ticket.user_email}</p>
                      <p className="text-xs text-slate-500 mt-1">Ticket ID: {ticket.id.substring(0, 8)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {checkedIn ? (
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800 border-0 mb-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Checked In
                        </Badge>
                        <p className="text-xs text-slate-500">
                          {format(new Date(checkedIn.checked_in_at), 'HH:mm')}
                        </p>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleManualCheckIn(ticket)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Check In
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const qrCode = generateQRCode(ticket.id);
                        alert(`QR Code: ${qrCode}\n\nShow this to attendee or scan their code at entry.`);
                      }}
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}