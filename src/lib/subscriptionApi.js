import apiClient from '@/lib/apiClient';
import { apiErrorMessage } from '@/lib/withdrawalsApi';
import { formatINR } from '@/lib/format';

/**
 * Subscription, promo-code and plan-payment calls. Prices are never worked out
 * in the browser: the server returns the discounted amount for a plan + cycle
 * (`validatePromo`) and builds the Razorpay order from the same calculation
 * (`createOrder`).
 */

export { apiErrorMessage };

export const subscriptionApi = {
  /** The caller's current platform plan. Free when nothing paid is in force. */
  mine: () => apiClient.get('/subscriptions/my-subscription').then((r) => r.data),

  /**
   * Prices a promo code for one plan + cycle.
   * Resolves to { code, originalAmount, discountAmount, finalAmount, message, ... }
   * and rejects with a message that is safe to show (see apiErrorMessage).
   */
  validatePromo: ({ code, planId, cycle }) =>
    apiClient.post('/subscriptions/promo-codes/validate', { code, planId, cycle }).then((r) => r.data),

  /** Plan details, dates and last payment for the Profile billing view. */
  billing: () => apiClient.get('/subscriptions/my-billing').then((r) => r.data),

  /**
   * Starts a purchase. For a paid plan this is a Razorpay order ({ order_id, amount, key_id }).
   * When a promo code covers the whole price the server activates the plan itself and answers
   * { success: true, free: true, subscription } - no order, no popup.
   */
  createOrder: ({ planId, cycle, couponCode }) =>
    apiClient.post('/payments/create-order', { planId, cycle, couponCode: couponCode || undefined }).then((r) => r.data),

  /**
   * Server-side signature + capture check, then activation. Idempotent per payment.
   * Right after checkout Razorpay can still report the payment as "authorized" for a
   * moment (the server answers 409 { pending: true }); retry a few times before giving up.
   */
  verifyPayment: async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }, { attempts = 4, delayMs = 1500 } = {}) => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const res = await apiClient.post('/payments/verify', { razorpay_order_id, razorpay_payment_id, razorpay_signature });
        return res.data;
      } catch (error) {
        const pending = error?.response?.status === 409 && error?.response?.data?.pending;
        if (!pending || attempt >= attempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  },
};

/** 'monthly' | 'annually', whatever spelling the caller used. */
export function normaliseCycle(cycle) {
  return /^(annual|annually|yearly|year|y)$/i.test(String(cycle || '')) ? 'annually' : 'monthly';
}

/** A finite number, or null. Keeps NaN/undefined out of anything rendered as a price. */
export function finiteOrNull(value) {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) ? n : null;
}

/** The plan's list price for a cycle, in rupees. Mirrors the server's rule. */
export function listPrice(plan, cycle) {
  const monthly = finiteOrNull(plan?.price_monthly) || finiteOrNull(plan?.price) || 0;
  if (normaliseCycle(cycle) === 'annually') return finiteOrNull(plan?.price_annually) || monthly * 12;
  return monthly;
}

/**
 * What to show for a plan + cycle once an optional server quote is applied.
 * `quotes` is { monthly, annually } as returned by validatePromo (or null).
 */
export function priceView(plan, cycle, quotes) {
  const key = normaliseCycle(cycle);
  const base = listPrice(plan, key);
  const quote = quotes ? quotes[key] : null;
  const final = quote ? finiteOrNull(quote.finalAmount) : null;
  const discounted = final !== null && final < base;
  return {
    base,
    final: discounted ? final : base,
    discounted,
    saving: discounted ? Math.round((base - final) * 100) / 100 : 0,
  };
}

/** Free-plan rows have no end date and are named Free/Basic. */
export function isFreeSubscription(subscription) {
  if (!subscription) return true;
  if (subscription.is_free === true) return true;
  return /^(free|basic)$/i.test(String(subscription.plan_type || '').trim()) && !subscription.end_date;
}

/** Rupee text, e.g. ₹1,499 or ₹499.50; "—" for anything that is not a number. */
export function rupees(value) {
  return formatINR(value);
}

const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let razorpayLoading = null;

/**
 * Resolves once window.Razorpay exists. index.html normally loads checkout.js already;
 * this covers the cases where it did not (blocked, slow, offline at page load) by
 * injecting it once, and rejects with a message fit to show if it cannot be loaded.
 */
export function loadRazorpay() {
  if (typeof window !== 'undefined' && typeof window.Razorpay === 'function') return Promise.resolve(window.Razorpay);
  if (!razorpayLoading) {
    razorpayLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_SRC;
      script.async = true;
      script.onload = () => (typeof window.Razorpay === 'function' ? resolve(window.Razorpay) : reject(new Error('The payment window could not be loaded.')));
      script.onerror = () => reject(new Error('The payment window could not be loaded. Check your connection or disable content blockers, then try again.'));
      document.body.appendChild(script);
    }).catch((e) => {
      razorpayLoading = null; // allow a retry
      throw e;
    });
  }
  return razorpayLoading;
}
