import React, { useState } from 'react';
import { Event } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Calendar,
  MapPin,
  Users,
  Crown,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function EventApprovalQueue({ events, onUpdate, permissions }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingEvents = events.filter(e => e.status === 'pending_approval');

  const handleApprove = async (event, notes = '') => {
    if (!permissions.canApproveEvents) {
      toast.error('You do not have permission to approve events');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Approving event:', event.id, 'Current status:', event.status);
      
      // FIXED: Update status to 'approved' (not 'scheduled')
      await Event.update(event.id, {
        status: 'approved',
        admin_notes: notes || adminNotes
      });

      console.log('Event approved successfully, new status: approved');
      
      toast.success('Event approved successfully!');
      setShowReviewModal(false);
      setSelectedEvent(null);
      setAdminNotes('');
      
      // Force refresh
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Error approving event:', error);
      toast.error('Failed to approve event');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (event, notes = '') => {
    if (!permissions.canApproveEvents) {
      toast.error('You do not have permission to reject events');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Rejecting event:', event.id);
      
      await Event.update(event.id, {
        status: 'rejected',
        admin_notes: notes || adminNotes
      });

      console.log('Event rejected successfully');
      
      toast.success('Event rejected');
      setShowReviewModal(false);
      setSelectedEvent(null);
      setAdminNotes('');
      
      // Force refresh
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast.error('Failed to reject event');
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewModal = (event) => {
    setSelectedEvent(event);
    setAdminNotes(event.admin_notes || '');
    setShowReviewModal(true);
  };

  if (pendingEvents.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-500">
            No events are currently waiting for approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Pending Approvals
            </CardTitle>
            <Badge className="bg-orange-100 text-orange-800 border-0">
              {pendingEvents.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingEvents.map(event => (
              <Card key={event.id} className="border-2 border-orange-200 bg-orange-50/50">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Event Image */}
                    {event.image_url && (
                      <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Event Details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {event.title}
                          </h4>
                          {event.is_premium && (
                            <Badge className="bg-purple-100 text-purple-800 border-0">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          {new Date(event.event_date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-red-500" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users className="w-4 h-4 text-purple-600" />
                          Organizer: {event.organizer_name || 'Unknown'}
                        </div>
                        {event.capacity && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            Capacity: {event.capacity}
                          </div>
                        )}
                      </div>

                      {event.ticket_price && event.ticket_price > 0 && (
                        <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-1.5 inline-block">
                          <span className="text-sm font-semibold text-yellow-900">
                            Ticket Price: ₹{event.ticket_price}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex md:flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewModal(event)}
                        className="flex-1 md:flex-none"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(event)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(event)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {event.admin_notes && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Admin Notes:</strong> {event.admin_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Review</DialogTitle>
            <DialogDescription>
              Review event details and add notes before approving or rejecting
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Event Image */}
              {selectedEvent.image_url && (
                <div className="w-full h-64 rounded-lg overflow-hidden">
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Event Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedEvent.title}
                  </h3>
                  <p className="text-gray-600">{selectedEvent.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Date & Time</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedEvent.event_date).toLocaleString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Location</p>
                    <p className="font-medium text-gray-900">{selectedEvent.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Organizer</p>
                    <p className="font-medium text-gray-900">
                      {selectedEvent.organizer_name || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Capacity</p>
                    <p className="font-medium text-gray-900">
                      {selectedEvent.capacity || 'Unlimited'}
                    </p>
                  </div>
                  {selectedEvent.is_premium && (
                    <div>
                      <p className="text-gray-500 mb-1">Ticket Price</p>
                      <p className="font-medium text-purple-900">
                        ₹{selectedEvent.ticket_price || 0}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 mb-1">Event Type</p>
                    <Badge className={selectedEvent.is_premium ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}>
                      {selectedEvent.is_premium ? 'Premium' : 'Free'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this event review..."
                  rows={4}
                  className="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedEvent, adminNotes)}
                  disabled={isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Event
                </Button>
                <Button
                  onClick={() => handleApprove(selectedEvent, adminNotes)}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}