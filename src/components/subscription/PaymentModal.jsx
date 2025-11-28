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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Loading payment details...</p>
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
    console.log('✅ Payment completed:', paymentData);
    
    // ✅ FIX: Call parent with BOTH plan and payment data
    if (onPaymentSuccess) {
      onPaymentSuccess(plan, paymentData);
    }
  };

  const handleFailure = (error) => {
    console.error('❌ Payment failed:', error);
    toast.error('Payment failed. Please try again.');
    setHasCalledSuccess(false); // Reset flag on failure
  };

  const handleClose = () => {
    if (!hasCalledSuccess) {
      onClose();
    } else {
      console.log('Payment processing in progress, preventing modal close');
    }
  };

  return (
    <UniversalPaymentModal
      open={open}
      onClose={handleClose}
      amount={plan.price}
      currency="INR"
      description={`${plan.name} Subscription - ${plan.cycle === 'monthly' ? 'Monthly' : 'Annual'}`}
      customerInfo={{
        name: user.display_name || user.full_name || 'User',
        email: user.email
      }}
      metadata={{
        subscription_plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: plan.cycle,
        user_id: user.id,
        ...(plan.discount && {
          promo_code: plan.discount.code,
          discount_amount: plan.discount.amount,
          original_price: plan.originalPrice
        })
      }}
      onSuccess={handleSuccess}
      onFailure={handleFailure}
    />
  );
}