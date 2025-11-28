import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function CancellationModal({ open, onClose, onConfirm, isLoading }) {
  const [reasonCategory, setReasonCategory] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const reasonCategories = [
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'not_using', label: 'Not using enough' },
    { value: 'found_alternative', label: 'Found a better alternative' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'temporary_break', label: 'Taking a temporary break' },
    { value: 'other', label: 'Other' },
  ];

  const getReasonLabel = () => {
    const category = reasonCategories.find(r => r.value === reasonCategory);
    return category ? category.label : '';
  };

  const handleConfirm = () => {
    if (!reasonCategory) {
      return;
    }

    // ✅ FIX: Prevent duplicate submissions
    if (hasConfirmed || isLoading) {
      return;
    }

    setHasConfirmed(true);

    onConfirm({
      reason: getReasonLabel(),
      reason_category: reasonCategory,
      additional_feedback: additionalFeedback,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setReasonCategory('');
      setAdditionalFeedback('');
      setHasConfirmed(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Please let us know why you're cancelling so we can improve our service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory} disabled={isLoading}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us more about your experience..."
              value={additionalFeedback}
              onChange={(e) => setAdditionalFeedback(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <p className="text-amber-800">
              <strong>Important:</strong> Your subscription will remain active until the end of your current billing period. 
              You can continue to use all premium features until then.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reasonCategory || isLoading || hasConfirmed}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}