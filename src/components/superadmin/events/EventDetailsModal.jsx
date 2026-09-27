
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventAttendee, EventTicket, EventCommissionTracking, EventCheckIn, EventPromoCode, EventReminder, EventFeedback } from '@/api/entities';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Download,
  Star,
  Crown,
  AlertTriangle,
  QrCode, // Added for Check-Ins tab
  Ticket // Added for Promo Codes tab
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import EventCancellationModal from './EventCancellationModal';
import EventRefundPanel from './EventRefundPanel';
import QRCheckInSystem from '../../organizer/QRCheckInSystem';
import PromoCodeManager from '../../organizer/PromoCodeManager';
import AttendeeExport from '../../organizer/AttendeeExport';

export default function EventDetailsModal({ event, open, onClose, onUpdate }) {
  const [attendees, setAttendees] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [commission, setCommission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // New states for additional tabs
  const [checkIns, setCheckIns] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('details'); // Initial active tab
  const [isLoadingAdditional, setIsLoadingAdditional] = useState(false); // New state for additional data loading

  useEffect(() => {
    if (open && event) {
      setIsLoading(true); // Set loading true for initial load of core data
      loadEventDetails().finally(() => setIsLoading(false)); // Core data loads, then main spinner hides
      loadAdditionalData(); // Additional data starts loading, but doesn't hold up main spinner
    }
  }, [open, event]);

  const loadEventDetails = async () => {
    try {
      const [attendeesData, ticketsData, commissionData] = await Promise.all([
        EventAttendee.filter({ event_id: event.id }),
        EventTicket.filter({ event_id: event.id }),
        EventCommissionTracking.filter({ event_id: event.id }).then(data => data[0] || null)
      ]);

      setAttendees(attendeesData);
      setTickets(ticketsData);
      setCommission(commissionData);
    } catch (error) {
      console.error('Error loading event details:', error);
      toast.error('Failed to load event details');
    }
  };

  const loadAdditionalData = async () => {
    setIsLoadingAdditional(true);
    try {
      // Load data with delays to avoid rate limiting
      const checkInsData = await EventCheckIn.filter({ event_id: event.id }).catch(() => []);
      setCheckIns(checkInsData);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const promoCodesData = await EventPromoCode.filter({ event_id: event.id }).catch(() => []);
      setPromoCodes(promoCodesData);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const remindersData = await EventReminder.filter({ event_id: event.id }).catch(() => []);
      setReminders(remindersData);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const feedbacksData = await EventFeedback.filter({ event_id: event.id }).catch(() => []);
      setFeedbacks(feedbacksData);
      
    } catch (error) {
      console.error('Error loading additional data:', error);
      toast.error('Failed to load additional event data');
    } finally {
      setIsLoadingAdditional(false);
    }
  };

  const handleExportAttendees = () => {
    const csvContent = [
      ['Name', 'Email', 'RSVP Status', 'Confirmed', 'Date'].join(','),
      ...attendees.map(a => [
        a.user_name || 'N/A',
        a.user_id || 'N/A', // Assuming user_id can be used as email for export, or adjust if actual email is available
        a.rsvp_status,
        a.confirmed ? 'Yes' : 'No',
        format(new Date(a.created_date), 'dd/MM/yyyy')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}-attendees.csv`;
    a.click();
    toast.success('Attendee list exported successfully');
  };

  const handleApprove = async () => {
    setIsUpdating(true);
    try {
      // Simulate API call to update event status
      // await Event.update(event.id, { status: 'approved' });
      toast.success('Event approved (action simulated)');
      await loadEventDetails(); // Reload data after update
      if (onUpdate) onUpdate(); // Notify parent of update
    } catch (error) {
      console.error('Error approving event:', error);
      toast.error('Failed to approve event');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    setIsUpdating(true);
    try {
      // Simulate API call to update event status
      // await Event.update(event.id, { status: 'rejected' });
      toast.success('Event rejected (action simulated)');
      await loadEventDetails(); // Reload data after update
      if (onUpdate) onUpdate(); // Notify parent of update
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast.error('Failed to reject event');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleFeatured = async () => {
    setIsUpdating(true);
    try {
      // Simulate API call to update featured status
      // await Event.update(event.id, { is_featured: !event.is_featured });
      toast.success(`Event ${event.is_featured ? 'removed from' : 'marked as'} featured (action simulated)`);
      await loadEventDetails(); // Reload data after update
      if (onUpdate) onUpdate(); // Notify parent of update
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Failed to update featured status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEvent = () => {
    setShowCancelModal(true);
  };

  const handleCancelSuccess = async () => {
    setShowCancelModal(false);
    await loadEventDetails(); // Reload event details to reflect cancellation
    if (onUpdate) {
      onUpdate(); // Notify parent component of the change
    }
    toast.success('Event cancelled successfully');
  };

  const rsvpStats = {
    yes: attendees.filter(a => a.rsvp_status === 'yes').length,
    no: attendees.filter(a => a.rsvp_status === 'no').length,
    maybe: attendees.filter(a => a.rsvp_status === 'maybe').length,
    confirmed: attendees.filter(a => a.confirmed).length
  };

  const ticketStats = {
    total: tickets.length,
    active: tickets.filter(t => t.status === 'active').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
    refunded: tickets.filter(t => t.status === 'refunded').length
  };

  const statusConfig = {
    pending_approval: { color: 'bg-hold-muted text-hold-muted-foreground', icon: Clock, label: 'Pending Approval' },
    approved: { color: 'bg-premium-muted text-protocall-blue', icon: CheckCircle, label: 'Approved' },
    rejected: { color: 'bg-sell-muted text-sell-muted-foreground', icon: XCircle, label: 'Rejected' },
    scheduled: { color: 'bg-buy-muted text-buy-muted-foreground', icon: Calendar, label: 'Scheduled' },
    cancelled: { color: 'bg-surface-2 text-foreground', icon: AlertCircle, label: 'Cancelled' },
    completed: { color: 'bg-premium-muted text-protocall-premium-text', icon: CheckCircle, label: 'Completed' }
  };

  const currentStatus = statusConfig[event?.status] || statusConfig.pending_approval;
  const StatusIcon = currentStatus.icon;

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
            <Badge className={`${currentStatus.color} border-0 flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {currentStatus.label}
            </Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-protocall-blue"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Using flex-wrap for TabsList to handle many tabs gracefully */}
            <TabsList className="flex flex-wrap gap-2 w-full bg-transparent p-0 mb-4">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="attendees"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                Attendees ({attendees.length})
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                Tickets ({tickets.length})
              </TabsTrigger>
              <TabsTrigger
                value="revenue"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                Revenue
              </TabsTrigger>
              <TabsTrigger
                value="refunds"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                Refunds
              </TabsTrigger>
              <TabsTrigger
                value="checkins"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <QrCode className="w-4 h-4 mr-1" />
                Check-Ins ({checkIns.length})
              </TabsTrigger>
              <TabsTrigger
                value="promos"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <Ticket className="w-4 h-4 mr-1" />
                Promo Codes ({promoCodes.length})
              </TabsTrigger>
              <TabsTrigger
                value="reminders"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <Mail className="w-4 h-4 mr-1" />
                Reminders ({reminders.length})
              </TabsTrigger>
              <TabsTrigger
                value="feedback"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <Star className="w-4 h-4 mr-1" />
                Feedback ({feedbacks.filter(f => f.status === 'submitted').length})
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-protocall-deep data-[state=active]:to-protocall-blue data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold shadow-md py-2.5 transition-all duration-300 bg-surface-2 text-protocall-blue hover:from-protocall-deep hover:to-protocall-blue hover:text-white hover:shadow-lg"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab (renamed to Details) */}
            <TabsContent value="details" className="space-y-6 mt-0 flex-1 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-protocall-blue" />
                    Event Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-subtle">Event Date</p>
                          <p className="font-semibold text-foreground">
                            {format(new Date(event.event_date), 'PPP p')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-subtle">Location</p>
                          <p className="font-semibold text-foreground">{event.location}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-subtle">Capacity</p>
                          <p className="font-semibold text-foreground">
                            {attendees.length} / {event.capacity || 'Unlimited'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-subtle">Ticket Price</p>
                          <p className="font-semibold text-foreground">
                            {event.is_premium ? `₹${event.ticket_price?.toLocaleString()}` : 'Free'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-subtle">Organizer</p>
                          <p className="font-semibold text-foreground">{event.organizer_name}</p>
                        </div>
                      </div>

                      {event.is_featured && (
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-surface-2 to-hold-muted rounded-lg border border-hold/30">
                          <Star className="w-5 h-5 text-hold-muted-foreground fill-hold" />
                          <span className="text-sm font-semibold text-hold-muted-foreground">Featured Event</span>
                        </div>
                      )}

                      {event.is_premium && (
                        <div className="flex items-center gap-2 p-3 bg-surface-2 rounded-lg border border-protocall-premium-light">
                          <Crown className="w-5 h-5 text-protocall-premium-text" />
                          <span className="text-sm font-semibold text-protocall-premium-text">Premium Event</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-subtle mb-2">Description</p>
                    <p className="text-subtle leading-relaxed">{event.description}</p>
                  </div>

                  {event.admin_notes && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-subtle mb-2">Admin Notes</p>
                      <p className="text-subtle bg-surface-2 p-3 rounded-lg">{event.admin_notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    {event.status === 'pending_approval' && (
                      <>
                        <Button
                          onClick={handleApprove}
                          disabled={isUpdating}
                          className="bg-buy-soft hover:from-buy hover:to-buy text-buy-foreground rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Event
                        </Button>
                        <Button
                          onClick={handleReject}
                          disabled={isUpdating}
                          variant="outline"
                          className="border-2 border-sell/30 text-sell-muted-foreground hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-sell rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Event
                        </Button>
                      </>
                    )}

                    {['approved', 'scheduled'].includes(event.status) && (
                      <>
                        <Button
                          onClick={handleToggleFeatured}
                          disabled={isUpdating}
                          variant="outline"
                          className="border-2 border-hold/30 text-hold-muted-foreground hover:bg-gradient-to-r hover:from-surface-2 hover:to-hold-muted hover:border-hold rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          {event.is_featured ? 'Remove Featured' : 'Mark as Featured'}
                        </Button>
                        <Button
                          onClick={handleCancelEvent}
                          disabled={isUpdating}
                          variant="outline"
                          className="border-2 border-sell/30 text-sell-muted-foreground hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-sell rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Cancel Event
                        </Button>
                      </>
                    )}

                    <Button
                      onClick={handleExportAttendees}
                      variant="outline"
                      className="border-2 border-protocall-premium-light text-protocall-blue hover:bg-gradient-to-r hover:from-surface-2 hover:to-surface-2 hover:border-protocall-blue rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Attendees
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-subtle">Total RSVPs</p>
                        <p className="text-2xl font-bold text-protocall-blue mt-1">{attendees.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-protocall-premium-light opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-subtle">Confirmed</p>
                        <p className="text-2xl font-bold text-buy-muted-foreground mt-1">{rsvpStats.confirmed}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-positive opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-subtle">Tickets Sold</p>
                        <p className="text-2xl font-bold text-protocall-premium-text mt-1">{ticketStats.active}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-protocall-premium-light opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-subtle">Revenue</p>
                        <p className="text-2xl font-bold text-buy-muted-foreground mt-1">
                          ₹{(commission?.gross_revenue || 0).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-positive opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Attendees Tab */}
            <TabsContent value="attendees" className="space-y-6 mt-0 flex-1 overflow-y-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-protocall-blue" />
                      Attendee List
                    </CardTitle>
                    {/* The AttendeeExport component also provides an export button */}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* RSVP Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-buy-muted p-4 rounded-lg border border-buy/30">
                      <p className="text-sm text-buy-muted-foreground">Yes</p>
                      <p className="text-2xl font-bold text-buy-muted-foreground">{rsvpStats.yes}</p>
                    </div>
                    <div className="bg-hold-muted p-4 rounded-lg border border-hold/30">
                      <p className="text-sm text-hold-muted-foreground">Maybe</p>
                      <p className="text-2xl font-bold text-hold-muted-foreground">{rsvpStats.maybe}</p>
                    </div>
                    <div className="bg-sell-muted p-4 rounded-lg border border-sell/30">
                      <p className="text-sm text-sell-muted-foreground">No</p>
                      <p className="text-2xl font-bold text-sell-muted-foreground">{rsvpStats.no}</p>
                    </div>
                    <div className="bg-premium-muted p-4 rounded-lg border border-protocall-premium-light">
                      <p className="text-sm text-protocall-blue">Confirmed</p>
                      <p className="text-2xl font-bold text-protocall-blue">{rsvpStats.confirmed}</p>
                    </div>
                  </div>

                  {/* Attendees Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-2 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">RSVP Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Confirmed</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {attendees.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">
                              No attendees yet
                            </td>
                          </tr>
                        ) : (
                          attendees.map((attendee) => (
                            <tr key={attendee.id} className="hover:bg-surface-2">
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground">{attendee.user_name || 'Unknown'}</p>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={
                                  attendee.rsvp_status === 'yes' ? 'bg-buy-muted text-buy-muted-foreground' :
                                  attendee.rsvp_status === 'maybe' ? 'bg-hold-muted text-hold-muted-foreground' :
                                  'bg-sell-muted text-sell-muted-foreground'
                                }>
                                  {attendee.rsvp_status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {attendee.confirmed ? (
                                  <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-muted-foreground" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-subtle">
                                {format(new Date(attendee.created_date), 'dd MMM yyyy')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <AttendeeExport
                      event={event}
                      tickets={tickets}
                      attendees={attendees}
                      checkIns={checkIns}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="space-y-6 mt-0 flex-1 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-buy-muted-foreground" />
                    Ticket Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Ticket Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-premium-muted p-4 rounded-lg border border-protocall-premium-light">
                      <p className="text-sm text-protocall-blue">Total</p>
                      <p className="text-2xl font-bold text-protocall-blue">{ticketStats.total}</p>
                    </div>
                    <div className="bg-buy-muted p-4 rounded-lg border border-buy/30">
                      <p className="text-sm text-buy-muted-foreground">Active</p>
                      <p className="text-2xl font-bold text-buy-muted-foreground">{ticketStats.active}</p>
                    </div>
                    <div className="bg-hold-muted p-4 rounded-lg border border-hold/30">
                      <p className="text-sm text-hold-muted-foreground">Cancelled</p>
                      <p className="text-2xl font-bold text-hold-muted-foreground">{ticketStats.cancelled}</p>
                    </div>
                    <div className="bg-sell-muted p-4 rounded-lg border border-sell/30">
                      <p className="text-sm text-sell-muted-foreground">Refunded</p>
                      <p className="text-2xl font-bold text-sell-muted-foreground">{ticketStats.refunded}</p>
                    </div>
                  </div>

                  {/* Tickets Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-2 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ticket ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Payment Method</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {tickets.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                              No tickets sold yet
                            </td>
                          </tr>
                        ) : (
                          tickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-surface-2">
                              <td className="px-4 py-3">
                                <code className="text-xs bg-surface-2 px-2 py-1 rounded">
                                  {ticket.id.substring(0, 8)}
                                </code>
                              </td>
                              <td className="px-4 py-3 font-semibold text-foreground">
                                ₹{ticket.ticket_price?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={
                                  ticket.status === 'active' ? 'bg-buy-muted text-buy-muted-foreground' :
                                  ticket.status === 'cancelled' ? 'bg-hold-muted text-hold-muted-foreground' :
                                  'bg-sell-muted text-sell-muted-foreground'
                                }>
                                  {ticket.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-subtle">
                                {ticket.payment_method || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-subtle">
                                {format(new Date(ticket.purchased_date), 'dd MMM yyyy')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6 mt-0 flex-1 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-buy-muted-foreground" />
                    Revenue & Commission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {commission ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-surface-2 to-buy-muted p-6 rounded-xl border border-buy/30">
                          <p className="text-sm text-buy-muted-foreground mb-2">Gross Revenue</p>
                          <p className="text-3xl font-bold text-buy-muted-foreground">
                            ₹{commission.gross_revenue?.toLocaleString()}
                          </p>
                          <p className="text-xs text-buy-muted-foreground mt-1">Total ticket sales</p>
                        </div>

                        <div className="bg-surface-2 p-6 rounded-xl border border-protocall-premium-light">
                          <p className="text-sm text-protocall-blue mb-2">Platform Commission</p>
                          <p className="text-3xl font-bold text-protocall-blue">
                            ₹{commission.platform_commission?.toLocaleString()}
                          </p>
                          <p className="text-xs text-protocall-blue mt-1">
                            {commission.platform_commission_rate}% commission
                          </p>
                        </div>

                        <div className="bg-surface-2 p-6 rounded-xl border border-protocall-premium-light">
                          <p className="text-sm text-protocall-premium-text mb-2">Organizer Payout</p>
                          <p className="text-3xl font-bold text-protocall-premium-text">
                            ₹{commission.organizer_payout?.toLocaleString()}
                          </p>
                          <p className="text-xs text-protocall-premium-text mt-1">After commission</p>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="font-semibold text-foreground mb-4">Commission Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-subtle">Total Tickets Sold</p>
                            <p className="font-semibold text-foreground">{commission.total_tickets_sold || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-subtle">Commission Rate</p>
                            <p className="font-semibold text-foreground">{commission.platform_commission_rate}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-subtle">Payout Status</p>
                            <Badge className={
                              commission.payout_status === 'processed' ? 'bg-buy-muted text-buy-muted-foreground' :
                              commission.payout_status === 'pending' ? 'bg-hold-muted text-hold-muted-foreground' :
                              'bg-sell-muted text-sell-muted-foreground'
                            }>
                              {commission.payout_status}
                            </Badge>
                          </div>
                          {commission.payout_date && (
                            <div>
                              <p className="text-sm text-subtle">Payout Date</p>
                              <p className="font-semibold text-foreground">
                                {format(new Date(commission.payout_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No revenue data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Refund Tab */}
            <TabsContent value="refunds" className="space-y-6 mt-0 flex-1 overflow-y-auto">
              <EventRefundPanel
                event={event}
                onUpdate={async () => {
                  await loadEventDetails(); // Reload event details in this modal
                  if (onUpdate) {
                    onUpdate(); // Notify parent of update
                  }
                }}
              />
            </TabsContent>

            {/* Check-Ins Tab */}
            <TabsContent value="checkins" className="space-y-6 mt-0 flex-1 overflow-y-auto p-4">
              {isLoadingAdditional ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-protocall-blue mx-auto mb-4"></div>
                  <p className="text-subtle">Loading check-in data...</p>
                </div>
              ) : (
                <QRCheckInSystem 
                  event={event}
                  tickets={tickets}
                  onUpdate={() => {
                    loadAdditionalData(); // Reload check-ins data
                    loadEventDetails(); // Also reload tickets, as check-ins affect ticket status sometimes
                  }}
                />
              )}
            </TabsContent>

            {/* Promo Codes Tab */}
            <TabsContent value="promos" className="space-y-6 mt-0 flex-1 overflow-y-auto p-4">
              {isLoadingAdditional ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-protocall-blue mx-auto mb-4"></div>
                  <p className="text-subtle">Loading promo codes...</p>
                </div>
              ) : (
                <PromoCodeManager 
                  event={event}
                  onUpdate={loadAdditionalData} // Reload promo codes after update
                />
              )}
            </TabsContent>

            {/* Reminders Tab */}
            <TabsContent value="reminders" className="space-y-6 mt-0 flex-1 overflow-y-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-protocall-blue" />
                    Automated Reminders
                  </CardTitle>
                  <p className="text-sm text-subtle">Email reminders sent to ticket holders</p>
                </CardHeader>
                <CardContent>
                  {reminders.length > 0 ? (
                    <div className="space-y-3">
                      {reminders.map(reminder => (
                        <div key={reminder.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-foreground">
                                {reminder.reminder_type.replace(/_/g, ' ').toUpperCase()}
                              </p>
                              <p className="text-sm text-subtle">To: {reminder.user_id}</p>
                            </div>
                            <Badge className={reminder.sent ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-hold-muted text-hold-muted-foreground'}>
                              {reminder.sent ? 'Sent' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Scheduled: {format(new Date(reminder.scheduled_time), 'PPp')}</p>
                            {reminder.sent && <p>Sent: {format(new Date(reminder.sent_at), 'PPp')}</p>}
                            {reminder.error_message && (
                              <p className="text-sell-muted-foreground">Error: {reminder.error_message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-subtle">No reminders sent yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback" className="space-y-6 mt-0 flex-1 overflow-y-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-hold-muted-foreground" />
                    Event Feedback
                  </CardTitle>
                  <p className="text-sm text-subtle">Post-event feedback from attendees</p>
                </CardHeader>
                <CardContent>
                  {feedbacks.filter(f => f.status === 'submitted').length > 0 ? (
                    <div className="space-y-4">
                      {feedbacks.filter(f => f.status === 'submitted').map(feedback => (
                        <div key={feedback.id} className="p-4 bg-surface-2 rounded-lg border border-border">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-foreground">{feedback.user_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${star <= feedback.rating ? 'fill-hold text-hold' : 'text-muted-foreground'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-subtle">{feedback.rating}/5</span>
                              </div>
                            </div>
                            <Badge className={feedback.would_recommend ? 'bg-buy-muted text-buy-muted-foreground' : 'bg-surface-2 text-foreground'}>
                              {feedback.would_recommend ? 'Would Recommend' : 'Would Not Recommend'}
                            </Badge>
                          </div>

                          {feedback.feedback_text && (
                            <p className="text-sm text-subtle mb-3">{feedback.feedback_text}</p>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border">
                              <p className="text-muted-foreground">Content Quality</p>
                              <p className="font-semibold">{feedback.content_quality}/5</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="text-muted-foreground">Presentation</p>
                              <p className="font-semibold">{feedback.presentation_quality}/5</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="text-muted-foreground">Venue</p>
                              <p className="font-semibold">{feedback.venue_rating}/5</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="text-muted-foreground">Value</p>
                              <p className="font-semibold">{feedback.value_for_money}/5</p>
                            </div>
                          </div>

                          {feedback.favorite_part && (
                            <div className="mt-3 p-3 bg-buy-muted rounded border border-buy/30">
                              <p className="text-xs text-buy-muted-foreground font-medium">Favorite Part:</p>
                              <p className="text-sm text-buy-muted-foreground">{feedback.favorite_part}</p>
                            </div>
                          )}

                          {feedback.improvement_suggestions && (
                            <div className="mt-2 p-3 bg-premium-muted rounded border border-protocall-premium-light">
                              <p className="text-xs text-protocall-blue font-medium">Suggestions:</p>
                              <p className="text-sm text-protocall-blue">{feedback.improvement_suggestions}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-subtle">No feedback submitted yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {feedbacks.filter(f => f.status === 'pending').length > 0
                          ? `${feedbacks.filter(f => f.status === 'pending').length} feedback requests pending`
                          : 'Feedback requests will be sent after event completion'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6 mt-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-buy-soft text-buy-foreground">
                    <CardContent className="p-4">
                      <p className="text-sm text-buy-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold mt-1">
                        ₹{tickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-protocall-deep to-protocall-blue text-white">
                    <CardContent className="p-4">
                      <p className="text-sm text-protocall-blue">Tickets Sold</p>
                      <p className="text-2xl font-bold mt-1">{tickets.length}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-protocall-deep to-protocall-blue text-white">
                    <CardContent className="p-4">
                      <p className="text-sm text-protocall-premium-text">Check-In Rate</p>
                      <p className="text-2xl font-bold mt-1">
                        {tickets.length > 0 ? Math.round((checkIns.length / tickets.length) * 100) : 0}%
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-hold text-hold-foreground">
                    <CardContent className="p-4">
                      <p className="text-sm text-hold-muted-foreground">Avg Rating</p>
                      <p className="text-2xl font-bold mt-1">
                        {feedbacks.filter(f => f.status === 'submitted').length > 0
                          ? (feedbacks.filter(f => f.status === 'submitted').reduce((sum, f) => sum + f.rating, 0) / feedbacks.filter(f => f.status === 'submitted').length).toFixed(1)
                          : 'N/A'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Funnel</CardTitle>
                    <p className="text-sm text-subtle">Track conversion from views to attendance</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: 'Page Views', count: attendees.length * 10, color: 'bg-protocall-blue' },
                        { label: 'RSVPs (Yes)', count: attendees.filter(a => a.rsvp_status === 'yes').length, color: 'bg-primary' },
                        { label: 'Tickets Purchased', count: tickets.length, color: 'bg-buy' },
                        { label: 'Checked In', count: checkIns.length, color: 'bg-hold' }
                      ].map((stage, idx) => {
                        const maxCount = attendees.length > 0 ? attendees.length * 10 : 1; // Avoid division by zero
                        const widthPercent = (stage.count / maxCount) * 100;

                        return (
                          <div key={stage.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-subtle">{stage.label}</span>
                              <span className="text-sm font-bold text-foreground">{stage.count}</span>
                            </div>
                            <div className="w-full bg-border rounded-full h-6">
                              <div
                                className={`h-full ${stage.color} rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all`}
                                style={{ width: `${widthPercent.toFixed(0)}%` }}
                              >
                                {stage.count > 0 && `${widthPercent.toFixed(0)}%`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Promo Code Performance */}
                {promoCodes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Promo Code Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {promoCodes.map(promo => (
                          <div key={promo.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                            <div>
                              <code className="font-bold text-protocall-premium-text">{promo.code}</code>
                              <p className="text-xs text-muted-foreground">{promo.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{promo.current_uses} / {promo.max_uses || '∞'}</p>
                              <p className="text-xs text-muted-foreground">
                                {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`} off
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      {/* Cancellation Modal */}
      <EventCancellationModal
        event={event}
        tickets={tickets}
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={handleCancelSuccess}
      />
    </Dialog>
  );
}
