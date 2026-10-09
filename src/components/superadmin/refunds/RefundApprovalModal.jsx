import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

export default function RefundApprovalModal({ request, onClose, onApprove, onReject }) {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState(null); // 'approve' or 'reject'

  const handleSubmit = async () => {
    if (!notes.trim() && action === 'reject') {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      if (action === 'approve') {
        await onApprove(notes);
      } else if (action === 'reject') {
        await onReject(notes);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Refund Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-surface-2 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-subtle" />
              <div>
                <p className="text-sm text-subtle">Refund Amount</p>
                <p className="text-lg font-bold">₹{request.refund_amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-subtle" />
              <div>
                <p className="text-sm text-subtle">Request Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(request.created_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-subtle" />
              <div>
                <p className="text-sm text-subtle">User ID</p>
                <p className="text-sm font-medium">{request.user_id.slice(0, 12)}...</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-subtle" />
              <div>
                <p className="text-sm text-subtle">Ticket ID</p>
                <p className="text-sm font-medium">{request.ticket_id.slice(-12)}</p>
              </div>
            </div>
          </div>

          {/* Refund Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Reason Category</Label>
              <Badge className="mt-2">{request.refund_reason_category}</Badge>
            </div>

            <div>
              <Label className="text-sm font-semibold">Detailed Reason</Label>
              <p className="mt-2 text-sm text-subtle p-3 bg-surface-2 rounded-lg">
                {request.reason}
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Payment Details</Label>
              <div className="mt-2 text-sm text-subtle">
                <p><strong>Payment ID:</strong> {request.payment_id}</p>
                <p><strong>Gateway:</strong> {request.payment_gateway}</p>
              </div>
            </div>

            {request.auto_triggered && (
              <Alert className="bg-hold-muted border-hold/30">
                <AlertTriangle className="h-4 w-4 text-hold-muted-foreground" />
                <AlertDescription className="text-hold-muted-foreground">
                  This refund was automatically triggered due to event cancellation.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Admin Notes {action === 'reject' && <span className="text-sell-muted-foreground">*</span>}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                action === 'approve' 
                  ? 'Optional: Add any notes about this refund approval...'
                  : action === 'reject'
                  ? 'Required: Explain why this refund is being rejected...'
                  : 'Add notes or select an action below...'
              }
              className="h-24"
              required={action === 'reject'}
            />
          </div>

          {/* Warning for Approval */}
          {action === 'approve' && (
            <Alert className="bg-premium-muted border-protocall-premium-light">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                <strong>Processing Refund:</strong> The refund will be processed through {request.payment_gateway} 
                and the amount will be credited to the user's original payment method within 5-7 business days.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for Rejection */}
          {action === 'reject' && (
            <Alert className="bg-sell-muted border-sell/30">
              <XCircle className="h-4 w-4 text-sell-muted-foreground" />
              <AlertDescription className="text-sell-muted-foreground">
                <strong>Rejecting Request:</strong> The user will be notified of the rejection. 
                Please ensure you provide a clear reason above.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setAction('reject');
              setTimeout(handleSubmit, 100);
            }}
            disabled={isProcessing || action === 'approve'}
          >
            {isProcessing && action === 'reject' ? 'Rejecting...' : 'Reject Request'}
          </Button>
          <Button
            onClick={() => {
              setAction('approve');
              setTimeout(handleSubmit, 100);
            }}
            disabled={isProcessing || action === 'reject'}
            className="bg-buy text-buy-foreground hover:bg-buy-soft"
          >
            {isProcessing && action === 'approve' ? 'Processing...' : 'Approve & Process Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
