import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export default function PayoutApprovalModal({ 
  open, 
  onClose, 
  payout, 
  entityName,
  onApprove, 
  onReject, 
  canApprove 
}) {
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(adminNotes);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setIsProcessing(true);
    try {
      await onReject(adminNotes);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPayoutMethodIcon = (method) => {
    switch (method) {
      case 'bank_transfer': return CreditCard;
      case 'upi': return Smartphone;
      case 'paypal': return Wallet;
      default: return CreditCard;
    }
  };

  const PayoutMethodIcon = getPayoutMethodIcon(payout.payout_method);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payout Request Review</DialogTitle>
          <DialogDescription>
            Review and process the payout request from {entityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payout Details */}
          <div className="bg-surface-2 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Payout Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-subtle">Entity Name</p>
                <p className="font-medium">{entityName}</p>
              </div>
              <div>
                <p className="text-sm text-subtle">Entity Type</p>
                <p className="font-medium capitalize">{payout.entity_type}</p>
              </div>
              <div>
                <p className="text-sm text-subtle">Requested Amount</p>
                <p className="font-bold text-buy-muted-foreground text-lg">₹{payout.requested_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-subtle">Available Balance</p>
                <p className="font-medium">₹{payout.available_balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-subtle">Request Date</p>
                <p className="font-medium">{format(new Date(payout.created_date), 'MMM dd, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-subtle">Status</p>
                <Badge className={
                  payout.status === 'processed' ? 'bg-buy-muted text-buy-muted-foreground' :
                  payout.status === 'approved' ? 'bg-premium-muted text-primary' :
                  payout.status === 'rejected' ? 'bg-sell-muted text-sell-muted-foreground' :
                  'bg-hold-muted text-hold-muted-foreground'
                }>
                  {payout.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Payout Method Details */}
          <div className="bg-premium-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <PayoutMethodIcon className="w-5 h-5 text-primary" />
              Payout Method: {payout.payout_method.replace('_', ' ').toUpperCase()}
            </h3>
            
            {payout.payout_method === 'bank_transfer' && payout.bank_details && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-primary">Account Holder</p>
                  <p className="font-medium">{payout.bank_details.account_holder_name}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Account Number</p>
                  <p className="font-medium font-mono">
                    {payout.bank_details.account_number.replace(/.(?=.{4})/g, '*')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-primary">IFSC Code</p>
                  <p className="font-medium font-mono">{payout.bank_details.ifsc_code}</p>
                </div>
              </div>
            )}

            {payout.payout_method === 'upi' && payout.upi_id && (
              <div>
                <p className="text-sm text-primary">UPI ID</p>
                <p className="font-medium font-mono">{payout.upi_id}</p>
              </div>
            )}

            {payout.payout_method === 'paypal' && payout.paypal_email && (
              <div>
                <p className="text-sm text-primary">PayPal Email</p>
                <p className="font-medium">{payout.paypal_email}</p>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          {payout.status !== 'pending' && payout.admin_notes && (
            <div className="bg-surface-2 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Admin Notes</h4>
              <p className="text-sm text-subtle">{payout.admin_notes}</p>
              {payout.processed_date && (
                <p className="text-xs text-muted-foreground mt-2">
                  Processed on {format(new Date(payout.processed_date), 'MMM dd, yyyy HH:mm')}
                </p>
              )}
            </div>
          )}

          {/* Action Section for Pending Requests */}
          {payout.status === 'pending' && canApprove && (
            <div>
              <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this payout decision..."
                className="mt-2"
              />
            </div>
          )}

          {/* Processing Guidelines */}
          <div className="bg-hold-muted p-4 rounded-lg">
            <h4 className="font-semibold text-hold-muted-foreground mb-2">Processing Guidelines</h4>
            <ul className="text-sm text-hold-muted-foreground space-y-1">
              <li>• Verify that the requested amount doesn't exceed available balance</li>
              <li>• Ensure payout method details are complete and accurate</li>
              <li>• Bank transfers typically take 3-5 business days</li>
              <li>• UPI payments are processed within 24 hours</li>
              <li>• Always provide clear reasons for rejections</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {payout.status === 'pending' && canApprove && (
              <>
                <Button
                  onClick={handleReject}
                  disabled={isProcessing}
                  variant="ghost"
                  className="text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-buy text-buy-foreground hover:bg-buy-soft"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Approve Payout'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
