import React, { useState } from 'react';
import UniversalPaymentModal from '../payment/UniversalPaymentModal';
import { User } from '@/api/entities';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Subscription Payment Modal
 * Wrapper around UniversalPaymentModal for subscriptions
 */
export default function PaymentModal({ open, onClose, plan, onPaymentSuccess }) {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalledSuccess, setHasCalledSuccess] = useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        toast.error('Failed to load user information');
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadUser();
      setHasCalledSuccess(false); // Reset flag when modal opens
    }
  }, [open]);

  if (!plan || !user) {
    if (isLoading) {
      return open ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-subtle">Loading payment details...</p>
          </div>
        </div>
      ) : null;
    }
    return null;
  }

  const handleSuccess = (paymentData) => {
    // ✅ FIX: Prevent duplicate success calls
    if (hasCalledSuccess) {
      console.log('Payment success already processed, ignoring duplicate call');
      return;
    }

    setHasCalledSuccess(true);
    
    // ✅ FIX: Call parent with BOTH plan and payment data
    if (onPaymentSuccess) {
      onPaymentSuccess(plan, paymentData);
    }
  };

  // The modal has already shown the specific reason.
  const handleFailure = (error) => {
    console.error('❌ Payment failed:', error);
    setHasCalledSuccess(false); // Reset flag on failure
  };

  const handleClose = () => {
    if (!hasCalledSuccess) {
      onClose();
    } else {
      console.log('Payment processing in progress, preventing modal close');
    }
  };

  const cycleLabel = plan.cycle === 'annually' ? ' - Annual' : plan.cycle === 'monthly' ? ' - Monthly' : '';

  return (
    <UniversalPaymentModal
      open={open}
      onClose={handleClose}
      amount={plan.price}
      currency="INR"
      description={`${plan.name} Subscription${cycleLabel}`}
      customerInfo={{
        name: user.display_name || user.full_name || 'User',
        email: user.email
      }}
      metadata={{
        ...(plan.discount && { discount_amount: plan.discount.amount })
      }}
      planId={plan.id}
      cycle={plan.cycle || 'monthly'}
      couponCode={plan.discount?.code || null}
      onSuccess={handleSuccess}
      onFailure={handleFailure}
    />
  );
}
