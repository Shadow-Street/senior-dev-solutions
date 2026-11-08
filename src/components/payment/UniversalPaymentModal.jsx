import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { subscriptionApi, apiErrorMessage, rupees, loadRazorpay } from '@/lib/subscriptionApi';

/**
 * Razorpay checkout for a plan (platform or advisor).
 *
 * The browser names the plan; the server prices the order, checks the payment
 * signature and activates the subscription (POST /payments/create-order and
 * /payments/verify). `amount` is shown for information only and is never sent.
 *
 * There is deliberately no "mock payment" mode: a pretend success that the
 * caller then acted on (creating a subscription) was a free subscription.
 * Items without a server-side order flow (e.g. event tickets) cannot be paid
 * here yet and say so instead of faking it.
 */
export default function UniversalPaymentModal({
  open,
  onClose,
  amount,
  currency = 'INR',
  description,
  customerInfo,
  metadata = {},
  planId = null,
  cycle = 'monthly',
  couponCode = null,
  onSuccess,
  onFailure,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const paymentTaken = useRef(false);

  const canPay = Boolean(planId);
  const symbol = currency === 'INR' ? '₹' : '$';

  const fail = (message, cause) => {
    setError(message);
    toast.error(message);
    setIsProcessing(false);
    if (onFailure) onFailure(cause || new Error(message));
  };

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    setError(null);
    paymentTaken.current = false;
    try {
      // 1. The server prices the order from the plan row (and promo code).
      const orderData = await subscriptionApi.createOrder({ planId, cycle, couponCode });
      if (!orderData.success) {
        throw new Error('We could not start the payment. Please try again.');
      }
      await loadRazorpay();

      // 2. Open Razorpay Checkout.
      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Protocall',
        description,
        order_id: orderData.order_id,
        handler: async (response) => {
          paymentTaken.current = true;
          try {
            // 3. The server verifies the signature, then activates the subscription.
            toast.info('Confirming your payment...');
            const verifyData = await subscriptionApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyData.success) {
              if (onSuccess) onSuccess(verifyData);
              onClose();
            } else {
              fail(`We could not confirm your payment. If you were charged, contact support with payment id ${response.razorpay_payment_id}.`);
            }
          } catch (err) {
            console.error('Verification Error:', err);
            fail(
              `${apiErrorMessage(err, 'We could not confirm your payment.')} If you were charged, contact support with payment id ${response.razorpay_payment_id}.`,
              err
            );
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: customerInfo?.name || '',
          email: customerInfo?.email || '',
          contact: customerInfo?.phone || '',
        },
        theme: { color: '#6D28D9' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            if (paymentTaken.current) return;
            setError('Payment cancelled. You have not been charged.');
            toast.info('Payment cancelled. You have not been charged.');
          },
        },
      });
      rzp.on('payment.failed', (response) => {
        fail(response?.error?.description || 'The payment failed. You have not been charged.', response?.error);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment initialization error:', err);
      fail(apiErrorMessage(err, err.message || 'Failed to start the payment. Please try again.'), err);
    }
  };

  if (!open) return null;

  const discount = Number(metadata.discount_amount) || 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && isProcessing) return; onClose(next); }}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => { if (isProcessing) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (isProcessing) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-buy-muted-foreground" />
            Complete Your Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-2 border-protocall-premium-light bg-premium-muted">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">{description}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {currency === 'INR' ? rupees(amount) : `${symbol}${Number(amount) || 0}`}
                  </span>
                  {discount > 0 && (
                    <span className="text-sm line-through text-muted-foreground">
                      {symbol}{((Number(amount) || 0) + discount).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-subtle">One-time payment for this billing period</p>
                {discount > 0 && (
                  <Badge className="bg-buy-muted text-buy-muted-foreground">
                    Discount: {symbol}{discount} OFF
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {!canPay && (
            <div role="alert" className="bg-sell-muted border border-sell/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-sell-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-sell-muted-foreground font-semibold">Online payment is not available for this item yet.</p>
                <p className="text-xs text-sell-muted-foreground mt-1">Please contact support to complete this purchase.</p>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-sell-muted border border-sell/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-sell-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-sell-muted-foreground">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 py-3 border-t border-b">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-4 h-4 text-buy-muted-foreground" />
              Secure Payment
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-primary" />
              Verified by Razorpay
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleRazorpayPayment}
              disabled={isProcessing || !canPay}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay {currency === 'INR' ? rupees(amount) : `${symbol}${Number(amount) || 0}`}
                </>
              )}
            </Button>
          </div>

          {customerInfo && (
            <div className="text-xs text-muted-foreground text-center">
              Payment for: {customerInfo.name || customerInfo.email}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
