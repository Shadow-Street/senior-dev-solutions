import React, { useState } from 'react';
import apiClient from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/components/hooks/useSubscription';
import confetti from 'canvas-confetti';

export default function SubscriptionCheckoutModal({ open, onClose, plan, cycle, onSuccess }) {
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    // ✅ Get refreshSubscription to force update after payment
    const subscriptionContext = useSubscription();
    const refreshSubscription = subscriptionContext?.refreshSubscription;

    if (!plan) return null;

    // Calculate Base Price
    const basePrice = cycle === 'monthly' ? plan.price_monthly : plan.price_annually;

    // Calculate Final Price
    let discountAmount = 0;
    if (appliedCoupon) {
        discountAmount = appliedCoupon.discountAmount;
    }
    const finalPrice = Math.max(0, basePrice - discountAmount);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;

        setIsValidatingCoupon(true);
        setError(null);
        try {
            const { data } = await apiClient.post('/subscriptions/promo-codes/validate', {
                code: couponCode,
                cartAmount: basePrice
            });

            if (data.isValid) {
                setAppliedCoupon(data);
                toast.success(`Coupon "${couponCode}" applied!`);
            }
        } catch (err) {
            console.error('Coupon error:', err);
            setError(err.response?.data?.error || 'Invalid coupon code');
            setAppliedCoupon(null);
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setError(null);
    };

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            // 1. Create Order
            const { data: orderData } = await apiClient.post('/payments/create-order', {
                planId: plan.id,
                couponCode: appliedCoupon ? appliedCoupon.coupon.code : null,
                cycle
            });

            if (!orderData.success) {
                throw new Error('Failed to initiate payment');
            }

            // 2. Open Razorpay
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Shadow Street Protocol",
                description: `Subscription to ${plan.name}`,
                order_id: orderData.order_id,
                handler: async function (response) {
                    try {
                        // Verify
                        const { data: verifyData } = await apiClient.post('/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyData.success) {
                            toast.success("Welcome to Premium!");

                            // 🎉 Confetti Animation
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 }
                            });

                            // ✅ Force refresh subscription data to update UI immediately
                            if (refreshSubscription) {
                                console.log('🔄 Refreshing subscription after payment...');
                                refreshSubscription();
                            }

                            if (onSuccess) onSuccess();
                            onClose();
                        }
                    } catch (verErr) {
                        console.error("Verification failed", verErr);
                        toast.error("Payment verification failed");
                    }
                },
                theme: { color: "#4F46E5" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description);
            });
            rzp.open();

        } catch (err) {
            console.error('Payment Error:', err);
            toast.error(err.message || 'Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Complete Subscription</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Plan Summary */}
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-900">{plan.name} Plan</span>
                            <span className="text-gray-500 capitalize">{cycle}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Price</span>
                            <span>₹{basePrice}</span>
                        </div>

                        {appliedCoupon && (
                            <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                                <span className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Coupon ({appliedCoupon.coupon.code})
                                </span>
                                <span>- ₹{appliedCoupon.discountAmount}</span>
                            </div>
                        )}

                        <div className="border-t pt-2 flex justify-between items-center font-bold text-lg text-gray-900">
                            <span>Total</span>
                            <span>₹{finalPrice}</span>
                        </div>
                    </div>

                    {/* Coupon Input */}
                    <div className="space-y-2">
                        {!appliedCoupon ? (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Promo Code"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    disabled={isValidatingCoupon}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleApplyCoupon}
                                    disabled={!couponCode || isValidatingCoupon}
                                >
                                    {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-green-50 text-green-700 p-2 rounded border border-green-200">
                                <span className="flex items-center gap-2 text-sm">
                                    <CheckCircle className="w-4 h-4" /> Coupon Applied
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 text-green-700 hover:text-green-800 hover:bg-green-100" onClick={handleRemoveCoupon}>
                                    Remove
                                </Button>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Pay Button */}
                    <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        size="lg"
                        onClick={handlePayment}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing
                            </>
                        ) : (
                            `Pay ₹${finalPrice}`
                        )}
                    </Button>

                    <p className="text-center text-xs text-gray-500">
                        Secure payment via Razorpay. You can cancel anytime.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
