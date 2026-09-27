import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  DollarSign,
  Users,
  Mail,
  CheckCircle,
  Info
} from 'lucide-react';
import { Event, EventTicket, RefundRequest, Notification } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function EventCancellationModal({ 
  event, 
  tickets = [],
  open, 
  onClose, 
  onSuccess 
}) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [notifyAttendees, setNotifyAttendees] = useState(true);
  const [processRefunds, setProcessRefunds] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const isPremiumEvent = event?.is_premium && event?.ticket_price > 0;
  const activeTickets = tickets.filter(t => t.status === 'active');
  const totalRefundAmount = activeTickets.reduce((sum, t) => sum + (t.ticket_price || 0), 0);

  const handleCancelEvent = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    if (isPremiumEvent && activeTickets.length > 0 && !processRefunds) {
      toast.error('You must process refunds for paid events');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Update event status to cancelled
      await Event.update(event.id, {
        status: 'cancelled',
        admin_notes: cancellationReason
      });

      // Step 2: Process refunds for active tickets (if applicable)
      if (isPremiumEvent && processRefunds && activeTickets.length > 0) {
        const refundRequests = activeTickets.map(ticket => ({
          user_id: ticket.user_id,
          user_name: 'Attendee', // This should ideally come from user data
          user_email: ticket.user_id, // Placeholder - should be actual email
          transaction_type: 'event_ticket',
          related_entity_id: ticket.id,
          related_entity_name: event.title,
          original_transaction_id: ticket.payment_id,
          original_amount: ticket.ticket_price,
          refund_amount: ticket.ticket_price,
          refund_type: 'full',
          request_reason: `Event cancelled by organizer: ${cancellationReason}`,
          reason_category: 'cancelled_service',
          status: 'approved', // Auto-approve refunds for cancelled events
          priority: 'high',
          payment_gateway: 'razorpay', // Should come from ticket data
          payment_method: ticket.payment_method || 'card',
          requested_by: 'system',
          requested_by_role: 'system',
          auto_triggered: true,
          admin_notes: 'Automatic refund due to event cancellation'
        }));

        // Bulk create refund requests
        await RefundRequest.bulkCreate(refundRequests);

        // Update all active tickets to cancelled status
        await Promise.all(
          activeTickets.map(ticket => 
            EventTicket.update(ticket.id, { status: 'cancelled' })
          )
        );
      }

      // Step 3: Send notifications to attendees (if enabled)
      if (notifyAttendees && activeTickets.length > 0) {
        const notifications = activeTickets.map(ticket => ({
          user_id: ticket.user_id,
          title: '⚠️ Event Cancelled',
          message: `We regret to inform you that "${event.title}" scheduled for ${new Date(event.event_date).toLocaleDateString()} has been cancelled. ${isPremiumEvent && processRefunds ? 'A full refund has been initiated and will be processed within 5-7 business days.' : ''} Reason: ${cancellationReason}`,
          type: 'alert',
          page: 'general',
          status: 'unread'
        }));

        await Notification.bulkCreate(notifications);
      }

      toast.success(
        `Event cancelled successfully. ${activeTickets.length} ${isPremiumEvent && processRefunds ? 'refunds initiated' : 'attendees notified'}.`,
        { duration: 5000 }
      );

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error cancelling event:', error);
      toast.error('Failed to cancel event. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-sell-muted-foreground">
            <AlertTriangle className="w-6 h-6" />
            Cancel Event
          </DialogTitle>
          <DialogDescription>
            This action will cancel the event and process refunds for all attendees. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Summary */}
          <div className="bg-surface-2 p-4 rounded-xl border-2 border-sell/30">
            <h3 className="font-semibold text-sell-muted-foreground mb-2">{event.title}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-sell-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{activeTickets.length} Active Tickets</span>
              </div>
              {isPremiumEvent && (
                <div className="flex items-center gap-2 text-sell-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>Total Refund: ₹{totalRefundAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold">
              Cancellation Reason <span className="text-sell">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this event is being cancelled (will be visible to attendees)..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="h-32 border-2 border-border focus:border-sell rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be sent to all attendees in the notification email.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-foreground">Cancellation Options</h4>
            
            {/* Notify Attendees */}
            <div className="flex items-start gap-3 p-4 bg-premium-muted rounded-xl border border-protocall-premium-light">
              <Checkbox
                id="notify"
                checked={notifyAttendees}
                onCheckedChange={setNotifyAttendees}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="notify" className="flex items-center gap-2 font-semibold text-protocall-blue cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Send Notification to Attendees
                </Label>
                <p className="text-sm text-protocall-blue mt-1">
                  All {activeTickets.length} ticket holders will receive an in-app notification about the cancellation.
                </p>
              </div>
            </div>

            {/* Process Refunds */}
            {isPremiumEvent && activeTickets.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-buy-muted rounded-xl border border-buy/30">
                <Checkbox
                  id="refunds"
                  checked={processRefunds}
                  onCheckedChange={setProcessRefunds}
                  disabled={true}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="refunds" className="flex items-center gap-2 font-semibold text-buy-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    Process Full Refunds (Required)
                    <Badge className="bg-buy text-buy-foreground ml-2">Mandatory</Badge>
                  </Label>
                  <p className="text-sm text-buy-muted-foreground mt-1">
                    Full refunds will be automatically initiated for all {activeTickets.length} active tickets (₹{totalRefundAmount.toLocaleString()})
                  </p>
                  <p className="text-xs text-buy-muted-foreground mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Refunds will be processed within 5-7 business days
                  </p>
                </div>
              </div>
            )}

            {!isPremiumEvent && (
              <div className="p-4 bg-surface-2 rounded-xl border border-border">
                <p className="text-sm text-subtle flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  This is a free event, so no refunds will be processed.
                </p>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-hold-muted border-2 border-hold/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-hold-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-hold-muted-foreground">Important Warning</h4>
                <ul className="text-sm text-hold-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>This action cannot be undone</li>
                  <li>Event status will be permanently changed to "Cancelled"</li>
                  <li>All active tickets will be invalidated</li>
                  {isPremiumEvent && <li>Refunds will be automatically initiated</li>}
                  <li>Attendees will be notified immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="border-2 border-border hover:bg-surface-2 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCancelEvent}
            disabled={isProcessing || !cancellationReason.trim()}
            className="bg-gradient-to-r from-sell to-protocall-blue hover:from-sell hover:to-protocall-blue text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Cancellation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}