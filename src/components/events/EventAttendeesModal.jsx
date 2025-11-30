
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription // New import for DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Mail,
  User,
  CheckCircle,
  Clock,
  X,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// New imports for Tabs and Cards
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// New component imports
import AttendeeExport from '../organizer/AttendeeExport';
import QRCheckInSystem from '../organizer/QRCheckInSystem';

export default function EventAttendeesModal({ open, onClose, event }) { // Changed signature
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [checkIns, setCheckIns] = useState([]); // New state
  const [tickets, setTickets] = useState([]); // New state, implied by outline
  const [activeTab, setActiveTab] = useState('list'); // New state

  useEffect(() => {
    if (open && event) {
      setIsLoading(true); // Set loading when modal opens and event is available
      loadAttendees();
      loadCheckIns();
      loadTickets();
    }
  }, [open, event]); // Updated dependency array

  const loadAttendees = async () => {
    try {
      const data = await base44.entities.EventAttendee.filter({ event_id: event.id });
      setAttendees(data || []);
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast.error('Failed to load attendees');
    } finally {
      // setIsLoading(false); // Only set false after all data loads
    }
  };

  const loadCheckIns = async () => {
    try {
      // Assuming EventCheckIn is available via base44.entities
      const checkInData = await base44.entities.EventCheckIn.filter({ event_id: event.id });
      setCheckIns(checkInData || []);
    } catch (error) {
      console.error('Error loading check-ins:', error);
      toast.error('Failed to load check-ins');
    } finally {
      // setIsLoading(false); // Only set false after all data loads
    }
  };

  const loadTickets = async () => {
    try {
      // Assuming EventTicket is available via base44.entities
      // This is a placeholder; actual filtering might be more complex
      const ticketData = await base44.entities.EventTicket.filter({ event_id: event.id });
      setTickets(ticketData || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false); // Set isLoading to false after all initial data is loaded
    }
  };

  const filteredAttendees = attendees.filter(attendee => {
    const matchesSearch = attendee.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attendee.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || attendee.rsvp_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      yes: { color: 'bg-green-100 text-green-800', label: 'Confirmed', icon: CheckCircle },
      maybe: { color: 'bg-yellow-100 text-yellow-800', label: 'Maybe', icon: Clock },
      no: { color: 'bg-red-100 text-red-800', label: 'Not Attending', icon: X },
      waitlist: { color: 'bg-gray-100 text-gray-800', label: 'Waitlisted', icon: Clock }
    };
    const { color, label, icon: Icon } = config[status] || { color: 'bg-gray-200 text-gray-800', label: 'Unknown', icon: Clock }; // Default for unknown status
    return (
      <Badge className={`${color} border-0 flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // The original exportAttendees function is removed as it's replaced by AttendeeExport component.

  const stats = {
    total: attendees.length,
    confirmed: attendees.filter(a => a.rsvp_status === 'yes').length,
    maybe: attendees.filter(a => a.rsvp_status === 'maybe').length,
    declined: attendees.filter(a => a.rsvp_status === 'no').length
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"> {/* Changed className for width and flex layout */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" /> {/* Changed icon color */}
            Event Attendees - {event.title} {/* Changed title text */}
          </DialogTitle>
          <DialogDescription> {/* New DialogDescription */}
            Manage RSVPs, ticket holders, and check-ins
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading attendees, tickets, and check-in data...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Attendee List</TabsTrigger>
              <TabsTrigger value="checkin">QR Check-In</TabsTrigger>
              <TabsTrigger value="export">Export Data</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                  <div className="text-sm text-slate-600">Total RSVPs</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
                  <div className="text-sm text-green-600">Confirmed</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{stats.maybe}</div>
                  <div className="text-sm text-yellow-600">Maybe</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{stats.declined}</div>
                  <div className="text-sm text-red-600">Declined</div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search attendees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">All Status</option>
                    <option value="yes">Confirmed</option>
                    <option value="maybe">Maybe</option>
                    <option value="no">Declined</option>
                    <option value="waitlist">Waitlisted</option>
                  </select>
                </div>
                {/* The original export button is removed, as the AttendeeExport component is introduced */}
              </div>

              {/* Added div for title and export button as per outline in 'list' tab */}
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">All Attendees ({filteredAttendees.length})</h3> {/* Using filteredAttendees.length */}
                <AttendeeExport // Placed here as per outline
                  event={event}
                  tickets={tickets}
                  attendees={attendees}
                  checkIns={checkIns}
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                {filteredAttendees.length > 0 ? (
                  <div className="divide-y">
                    {filteredAttendees.map((attendee) => (
                      <div key={attendee.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">
                                {attendee.user_name || 'Anonymous User'}
                              </div>
                              {attendee.user_email && (
                                <div className="text-sm text-slate-600 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {attendee.user_email}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 mt-1">
                                RSVP'd on {format(new Date(attendee.created_date), 'PPp')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(attendee.rsvp_status)}
                            {attendee.confirmed && (
                              <Badge className="bg-blue-100 text-blue-800 border-0">
                                Admin Confirmed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      {searchTerm || statusFilter !== 'all' ? 'No matching attendees' : 'No RSVPs yet'}
                    </h3>
                    <p className="text-slate-500">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'Attendees will appear here as they RSVP to your event'
                      }
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="checkin" className="flex-1 overflow-y-auto mt-4">
              <QRCheckInSystem
                event={event}
                tickets={tickets}
                onUpdate={() => {
                  loadAttendees();
                  loadCheckIns();
                  loadTickets(); // Reload tickets too if needed by check-in system
                }}
              />
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-y-auto mt-4">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Export Attendee Data</CardTitle>
                  <p className="text-sm text-slate-600">Export attendee information with custom filters</p>
                </CardHeader>
                <CardContent>
                  <AttendeeExport
                    event={event}
                    tickets={tickets}
                    attendees={attendees}
                    checkIns={checkIns}
                  />

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      <strong>💡 Export Tips:</strong>
                    </p>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                      <li>Use filters to customize your export data</li>
                      <li>Export includes all selected fields in CSV format</li>
                      <li>Perfect for email campaigns or analytics</li>
                      <li>Check-in data helps track actual attendance</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t"> {/* This div is outside the Tabs to be a global modal action */}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
