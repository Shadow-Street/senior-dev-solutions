import React, { useState, useEffect } from 'react';
import { RefundRequest } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import EventRefundRequestModal from './EventRefundRequestModal';

export default function RefundRequestSection({ ticket, event, user, onRefundRequested }) {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [existingRefund, setExistingRefund] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingRefund();
  }, [ticket.id]);

  const checkExistingRefund = async () => {
    try {
      const refunds = await RefundRequest.filter({
        user_id: user.id,
        related_entity_id: ticket.id,
        transaction_type: 'event_ticket'
      });

      // Get the most recent refund request
      if (refunds.length > 0) {
        const sortedRefunds = refunds.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        setExistingRefund(sortedRefunds[0]);
      }
    } catch (error) {
      console.error('Error checking existing refund:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRefundStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending Organizer Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending Admin Approval
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-premium-muted text-protocall-blue border-protocall-premium-light">
            <Clock className="w-3 h-3 mr-1" />
            Processing Refund
          </Badge>
        );
      case 'processed':
        return (
          <Badge className="bg-buy-muted text-buy-muted-foreground border-buy/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Refund Processed
          </Badge>
        );
      case 'rejected':
      case 'cancelled':
      case 'failed':
        return (
          <Badge className="bg-sell-muted text-sell-muted-foreground border-sell/30">
            <XCircle className="w-3 h-3 mr-1" />
            Refund Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return null;
  }

  // If refund already requested and not rejected/cancelled
  if (existingRefund && !['rejected', 'cancelled', 'failed'].includes(existingRefund.status)) {
    return (
      <div className="mt-4 p-3 bg-hold-muted border border-hold/30 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-hold-muted-foreground" />
              <span className="text-sm font-medium text-hold-muted-foreground">Refund Request Submitted</span>
            </div>
            <p className="text-xs text-hold-muted-foreground mb-2">
              Your refund request is being reviewed. We'll notify you of any updates.
            </p>
            {getRefundStatusBadge(existingRefund.status)}
          </div>
        </div>
        {existingRefund.rejection_reason && (
          <div className="mt-2 p-2 bg-sell-muted border border-sell/30 rounded text-xs text-sell-muted-foreground">
            <strong>Reason:</strong> {existingRefund.rejection_reason}
          </div>
        )}
      </div>
    );
  }

  // Show refund button only if no pending refund
  return (
    <>
      <div className="mt-4 p-3 bg-premium-muted border border-protocall-premium-light rounded-lg">
        <div className="flex items-start gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-protocall-blue mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-protocall-blue mb-2">
              Since you've updated your RSVP to <strong>"No"</strong>, you can request a refund for your ticket.
            </p>
            <Button
              size="sm"
              onClick={() => setShowRefundModal(true)}
              className="bg-sell hover:bg-sell"
            >
              Request Refund
            </Button>
          </div>
        </div>
      </div>

      {showRefundModal && (
        <EventRefundRequestModal
          open={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            checkExistingRefund();
            onRefundRequested();
          }}
          ticket={ticket}
          event={event}
          user={user}
        />
      )}
    </>
  );
}