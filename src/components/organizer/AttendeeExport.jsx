
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function AttendeeExport({ event, tickets, attendees, checkIns }) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState({
    includeTicketHolders: true,
    includeRSVPs: true,
    includeCheckIns: true,
    onlyCheckedIn: false,
    onlyPaid: false,
    includeContactInfo: true,
    includePaymentInfo: false,
    includeCheckInTime: true
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Email'];
    
    if (filters.includeContactInfo) {
      headers.push('Phone', 'RSVP Status');
    }
    if (filters.includePaymentInfo) {
      headers.push('Ticket Price', 'Payment ID', 'Payment Date');
    }
    if (filters.includeCheckInTime) {
      headers.push('Checked In', 'Check-In Time');
    }

    const exportData = [];
    
    if (filters.includeTicketHolders) {
      tickets.forEach(ticket => {
        if (filters.onlyCheckedIn) {
          const checkIn = checkIns.find(c => c.ticket_id === ticket.id);
          if (!checkIn) return;
        }
        
        const checkIn = checkIns.find(c => c.ticket_id === ticket.id);
        const row = [
          ticket.user_name || 'N/A',
          ticket.user_email || 'N/A'
        ];
        
        if (filters.includeContactInfo) {
          row.push(ticket.user_phone || 'N/A', 'Paid Ticket');
        }
        if (filters.includePaymentInfo) {
          row.push(ticket.ticket_price, ticket.payment_id, format(new Date(ticket.purchased_date), 'yyyy-MM-dd HH:mm'));
        }
        if (filters.includeCheckInTime) {
          row.push(
            checkIn ? 'Yes' : 'No',
            checkIn ? format(new Date(checkIn.checked_in_at), 'yyyy-MM-dd HH:mm') : 'N/A'
          );
        }
        
        exportData.push(row);
      });
    }

    if (filters.includeRSVPs && !filters.onlyPaid) {
      attendees.forEach(attendee => {
        if (attendee.rsvp_status !== 'yes') return;
        if (tickets.some(t => t.user_id === attendee.user_id)) return;
        
        const row = [
          attendee.user_name || 'N/A',
          attendee.user_email || 'N/A'
        ];
        
        if (filters.includeContactInfo) {
          row.push('N/A', 'RSVP Only');
        }
        if (filters.includePaymentInfo) {
          row.push(0, 'N/A', 'N/A');
        }
        if (filters.includeCheckInTime) {
          row.push('No', 'N/A');
        }
        
        exportData.push(row);
      });
    }

    const csvContent = [
      headers.join(','),
      ...exportData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}_attendees_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Attendee list exported!');
    setShowExportModal(false);
  };

  return (
    <>
      <Button onClick={() => setShowExportModal(true)} variant="outline" className="gap-2">
        <Download className="w-4 h-4" />
        Export Attendees
      </Button>

      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Export Attendees - Advanced Filters
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Include Data From:</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ticketHolders"
                      checked={filters.includeTicketHolders}
                      onCheckedChange={(checked) => setFilters({ ...filters, includeTicketHolders: checked })}
                    />
                    <Label htmlFor="ticketHolders" className="text-sm">Ticket Holders ({tickets.length})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rsvps"
                      checked={filters.includeRSVPs}
                      onCheckedChange={(checked) => setFilters({ ...filters, includeRSVPs: checked })}
                    />
                    <Label htmlFor="rsvps" className="text-sm">RSVPs ({attendees.filter(a => a.rsvp_status === 'yes').length})</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-purple-900 mb-3">Filter By Status:</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="onlyCheckedIn"
                      checked={filters.onlyCheckedIn}
                      onCheckedChange={(checked) => setFilters({ ...filters, onlyCheckedIn: checked })}
                    />
                    <Label htmlFor="onlyCheckedIn" className="text-sm">Only Checked-In Attendees ({checkIns.length})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="onlyPaid"
                      checked={filters.onlyPaid}
                      onCheckedChange={(checked) => setFilters({ ...filters, onlyPaid: checked })}
                    />
                    <Label htmlFor="onlyPaid" className="text-sm">Only Paid Tickets</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-green-900 mb-3">Include Fields:</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contactInfo"
                      checked={filters.includeContactInfo}
                      onCheckedChange={(checked) => setFilters({ ...filters, includeContactInfo: checked })}
                    />
                    <Label htmlFor="contactInfo" className="text-sm">Contact Information</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="paymentInfo"
                      checked={filters.includePaymentInfo}
                      onCheckedChange={(checked) => setFilters({ ...filters, includePaymentInfo: checked })}
                    />
                    <Label htmlFor="paymentInfo" className="text-sm">Payment Information</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="checkInTime"
                      checked={filters.includeCheckInTime}
                      onCheckedChange={(checked) => setFilters({ ...filters, includeCheckInTime: checked })}
                    />
                    <Label htmlFor="checkInTime" className="text-sm">Check-In Status</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
