import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Universal Payment Modal with Mock Testing Support
 * Handles all types of payments across the platform
 */
export default function UniversalPaymentModal({
  open,
  onClose,
  amount,
  currency = 'INR',
  description,
  customerInfo,
  metadata = {},
  onSuccess,
  onFailure,
  enableMockPayment = true // Enable mock payments for testing
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null); // 'mock' or 'razorpay'

  useEffect(() => {
    if (open) {
      // Auto-select mock mode if enabled, otherwise check for Razorpay
      if (enableMockPayment) {
        setPaymentMode('mock');
      } else {
        setPaymentMode('razorpay');
      }
    }
  }, [open, enableMockPayment]);

  const handleMockPayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockPaymentData = {
      paymentId: `mock_pay_${Date.now()}`,
      amount: amount,
      currency: currency,
      metadata: metadata,
      status: 'captured'
    };

    try {
      // Call backend to persist mock transaction
      await apiClient.post('/payments/mock-success', {
        amount,
        currency,
        metadata
      });

      toast.success('Mock payment successful! 🎉');

      if (onSuccess) {
        onSuccess(mockPaymentData);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Mock payment error:', error);
      toast.error('Mock payment failed');
      if (onFailure) {
        onFailure(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ... (keep imports)

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create Order on Backend
      const { data: orderData } = await apiClient.post('/payments/create-order', {
        amount,
        currency,
        metadata
      });

      if (!orderData.success) {
        throw new Error('Failed to create payment order');
      }

      // 2. Initialize Razorpay Checkout
      const options = {
        key: orderData.key_id, // Key ID from backend
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Shadow Street Protocol",
        description: description,
        image: "https://your-logo-url.png", // Replace with valid logo
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // 3. Verify Payment on Backend
            const { data: verifyData } = await apiClient.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature // Corrected field name
            });

            if (verifyData.success) {
              toast.success('Payment successful!');
              if (onSuccess) onSuccess(verifyData);
              onClose();
            } else {
              toast.error('Payment verification failed');
              if (onFailure) onFailure(new Error('Verification failed'));
            }
          } catch (err) {
            console.error('Verification Error:', err);
            toast.error('Payment verification failed');
            if (onFailure) onFailure(err);
          }
        },
        prefill: {
          name: customerInfo?.name || "",
          email: customerInfo?.email || "",
          contact: customerInfo?.phone || ""
        },
        theme: {
          color: "#2563EB"
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.info('Payment cancelled');
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
        setIsProcessing(false);
        if (onFailure) onFailure(response.error);
      });

      rzp1.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMode === 'mock') {
      handleMockPayment();
    } else {
      handleRazorpayPayment();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Complete Your Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <Card className="border-2 border-blue-100 bg-blue-50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">{description}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600">
                    {currency === 'INR' ? '₹' : '$'}{amount.toLocaleString()}
                  </span>
                  {metadata.discount_amount > 0 && (
                    <span className="text-sm line-through text-slate-500">
                      {currency === 'INR' ? '₹' : '$'}{(amount + metadata.discount_amount).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">One-time payment</p>
                {metadata.discount_amount > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    Discount: {currency === 'INR' ? '₹' : '$'}{metadata.discount_amount} OFF
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          {enableMockPayment && (
            <div className="space-y-3">
              {/* Mock Payment Option */}
              <button
                onClick={() => setPaymentMode('mock')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${paymentMode === 'mock'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Mock Payment (Testing)</p>
                    <p className="text-xs text-slate-500">Instant test payment - no real money</p>
                  </div>
                  {paymentMode === 'mock' && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>

              {/* Razorpay Option */}
              <button
                onClick={() => setPaymentMode('razorpay')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${paymentMode === 'razorpay'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="font-bold text-blue-600 text-xs">R</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Payment via Razorpay</p>
                    <p className="text-xs text-slate-500">Cards, UPI, Net Banking & More</p>
                  </div>
                  {paymentMode === 'razorpay' && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Razorpay Not Configured Warning */}
          {paymentMode === 'razorpay' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-semibold">Payment gateway not configured.</p>
                <p className="text-xs text-red-600 mt-1">
                  Please contact support or use Mock Payment for testing.
                </p>
              </div>
            </div>
          )}

          {/* Mock Payment Instructions */}
          {paymentMode === 'mock' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-800 font-semibold">Test Mode Active</p>
                  <p className="text-xs text-green-600 mt-1">
                    This is a mock payment for testing. No real payment will be charged.
                    Click "Pay" to simulate a successful payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security Badges */}
          <div className="flex items-center justify-center gap-6 py-3 border-t border-b">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="w-4 h-4 text-green-600" />
              Secure Payment
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              256-bit SSL
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !paymentMode}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay {currency === 'INR' ? '₹' : '$'}{amount.toLocaleString()}
                </>
              )}
            </Button>
          </div>

          {/* Customer Info */}
          {customerInfo && (
            <div className="text-xs text-slate-500 text-center">
              Payment for: {customerInfo.name || customerInfo.email}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}