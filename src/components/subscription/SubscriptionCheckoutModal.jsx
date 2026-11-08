import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Tag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/components/hooks/useSubscription';
import { subscriptionApi, apiErrorMessage, listPrice, normaliseCycle, rupees, loadRazorpay } from '@/lib/subscriptionApi';
import { useAuth } from '@/components/context/AuthContext';
import confetti from 'canvas-confetti';

const CANCELLED_MESSAGE = 'Payment cancelled. You have not been charged.';

export default function SubscriptionCheckoutModal({ open, onClose, plan, cycle, onSuccess, initialCoupon = null }) {
    const [couponCode, setCouponCode] = useState('');
    // appliedCoupon is the server's quote: { code, originalAmount, discountAmount, finalAmount, message }
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const autoApplied = useRef(null);
    const paymentTaken = useRef(false); // the success handler has run: closing the popup is not a cancellation

    // Force a refresh of the subscription after payment so the UI updates immediately.
    const { user } = useAuth();
    const subscriptionContext = useSubscription();
    const refreshSubscription = subscriptionContext?.refreshSubscription;

    const planId = plan?.id;
    const planName = plan?.name;
    const billingCycle = normaliseCycle(cycle);
    const basePrice = plan ? listPrice(plan, billingCycle) : 0;

    // The coupon is priced for one plan + cycle; drop it when either changes.
    const quoteKey = plan ? `${planId}:${billingCycle}` : null;
    useEffect(() => {
        setAppliedCoupon((current) => (current && current.key !== quoteKey ? null : current));
    }, [quoteKey]);

    const applyCoupon = async (code) => {
        const trimmed = String(code || '').trim();
        if (!trimmed || !plan) return;

        setIsValidatingCoupon(true);
        setError(null);
        try {
            const quote = await subscriptionApi.validatePromo({ code: trimmed, planId, cycle: billingCycle });
            setAppliedCoupon({ ...quote, key: quoteKey });
            setCouponCode(quote.code || trimmed.toUpperCase());
            toast.success(quote.message || `Promo ${trimmed} applied`);
        } catch (err) {
            console.error('Coupon error:', err);
            setError(apiErrorMessage(err, 'Could not apply this promo code. Please try again.'));
            setAppliedCoupon(null);
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    // A code applied on the plan card is re-checked here for the chosen cycle.
    useEffect(() => {
        if (open && initialCoupon && plan && autoApplied.current !== `${quoteKey}:${initialCoupon}`) {
            autoApplied.current = `${quoteKey}:${initialCoupon}`;
            applyCoupon(initialCoupon);
        }
        if (!open) autoApplied.current = null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialCoupon, quoteKey]);

    if (!plan) return null;

    // The total shown is the server's figure; with no code it is the plan's list price.
    const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    const finalPrice = appliedCoupon ? appliedCoupon.finalAmount : basePrice;

    const isFreeWithCode = Boolean(appliedCoupon) && Number(appliedCoupon.finalAmount) === 0;

    const handleApplyCoupon = () => applyCoupon(couponCode);

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setError(null);
    };

    const handlePayment = async () => {
        setIsProcessing(true);
        setError(null);
        setNotice(null);
        paymentTaken.current = false;
        try {
            // 1. The server prices the order (plan + cycle + code); nothing monetary is sent.
            const orderData = await subscriptionApi.createOrder({
                planId,
                cycle: billingCycle,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
            });

            if (!orderData.success) {
                throw new Error('We could not start the payment. Please try again.');
            }

            // A promo code that covers the whole price: the server has already activated the
            // plan. There is no order, no Razorpay script and no popup.
            if (orderData.free) {
                toast.success(`${planName} is now active - it is free with your promo code.`);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                if (refreshSubscription) refreshSubscription();
                if (onSuccess) onSuccess();
                onClose();
                setIsProcessing(false);
                return;
            }

            // Make sure the checkout script is there (index.html loads it; this covers a blocked or slow load).
            await loadRazorpay();

            // 2. Open Razorpay
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Protocall",
                description: `${planName} - ${billingCycle === 'annually' ? 'Yearly' : 'Monthly'} subscription`,
                prefill: { name: user?.display_name || user?.name || '', email: user?.email || '' },
                order_id: orderData.order_id,
                handler: async function (response) {
                    paymentTaken.current = true;
                    try {
                        // 3. The server checks the signature and activates the plan.
                        toast.info('Confirming your payment...');
                        const verifyData = await subscriptionApi.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyData.success) {
                            toast.success(`Payment received. You are now on the ${planName} plan.`);

                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 }
                            });

                            if (refreshSubscription) refreshSubscription();
                            if (onSuccess) onSuccess();
                            onClose();
                        } else {
                            toast.error('We could not confirm your payment. If you were charged, contact support with your payment id: ' + response.razorpay_payment_id);
                        }
                    } catch (verErr) {
                        console.error("Verification failed", verErr);
                        toast.error(
                            apiErrorMessage(verErr, 'We could not confirm your payment.') +
                            ` If you were charged, contact support with payment id ${response.razorpay_payment_id}.`
                        );
                    } finally {
                        setIsProcessing(false);
                    }
                },
                modal: {
                    // Fired when the customer closes the popup ("Yes, exit"). The toast is global, so it
                    // shows even if this dialog has meanwhile been dismissed; the inline note covers the
                    // case where it is still open.
                    ondismiss: () => {
                        setIsProcessing(false);
                        if (paymentTaken.current) return;
                        setNotice(CANCELLED_MESSAGE);
                        toast.info(CANCELLED_MESSAGE);
                    },
                },
                theme: { color: "#6D28D9" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response?.error?.description || 'The payment failed. You have not been charged.');
                setIsProcessing(false);
            });
            rzp.open();

        } catch (err) {
            console.error('Payment Error:', err);
            const message = apiErrorMessage(err, err.message || 'Payment failed. Please try again.');
            setError(message);
            toast.error(message);
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next && isProcessing) return; onClose(next); }}>
            {/* Razorpay's popup is outside this dialog: clicking in it must not count as an outside click
                and close the dialog (and with it the context the customer returns to). */}
            <DialogContent className="max-w-md" onInteractOutside={(e) => { if (isProcessing) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (isProcessing) e.preventDefault(); }}>
                <DialogHeader>
                    <DialogTitle>Complete Subscription</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Plan Summary */}
                    <div className="bg-surface-2 p-4 rounded-lg space-y-2 border">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">{planName} Plan</span>
                            <span className="text-muted-foreground capitalize">{billingCycle}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-subtle">
                            <span>Price</span>
                            <span>{rupees(basePrice)}</span>
                        </div>

                        {appliedCoupon && (
                            <div className="flex justify-between items-center text-sm text-buy-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Promo ({appliedCoupon.code})
                                </span>
                                <span>- {rupees(discountAmount)}</span>
                            </div>
                        )}

                        <div className="border-t pt-2 flex justify-between items-center font-bold text-lg text-foreground">
                            <span>Total</span>
                            <span>{rupees(finalPrice)}</span>
                        </div>
                    </div>

                    {/* Coupon Input */}
                    <div className="space-y-2">
                        {!appliedCoupon ? (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Promo Code" aria-label="Promo code"
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
                            <div className="flex items-center justify-between bg-buy-muted text-buy-muted-foreground p-2 rounded border border-buy/30">
                                <span className="flex items-center gap-2 text-sm">
                                    <CheckCircle className="w-4 h-4" /> {appliedCoupon.message || 'Promo applied'}
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 text-buy-muted-foreground hover:text-buy-muted-foreground hover:bg-buy-muted" onClick={handleRemoveCoupon}>
                                    Remove
                                </Button>
                            </div>
                        )}
                        {notice && !error && (
                            <div role="status" className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-subtle">
                                <AlertCircle className="w-4 h-4" />
                                {notice}
                            </div>
                        )}
                        {error && (
                            <div role="alert" className="flex items-center gap-2 text-sell-muted-foreground text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Pay Button */}
                    <Button
                        className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg"
                        size="lg"
                        onClick={handlePayment}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing
                            </>
                        ) : (
                            isFreeWithCode ? 'Activate for free' : `Pay ${rupees(finalPrice)}`
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        {isFreeWithCode
                            ? 'Your promo code covers the full price, so no payment is needed.'
                            : 'Secure payment via Razorpay. You can cancel anytime.'}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
