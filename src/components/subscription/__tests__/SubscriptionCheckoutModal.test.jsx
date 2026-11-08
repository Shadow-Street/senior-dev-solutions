import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'u@example.test', display_name: 'U' } }) }))
vi.mock('@/components/hooks/useSubscription', () => ({ useSubscription: () => ({ refreshSubscription: refresh }) }))
vi.mock('@/lib/subscriptionApi', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, loadRazorpay: vi.fn(), subscriptionApi: { validatePromo: vi.fn(), createOrder: vi.fn(), verifyPayment: vi.fn() } }
})

const refresh = vi.fn()

import { subscriptionApi, loadRazorpay } from '@/lib/subscriptionApi'
import { toast } from 'sonner'
import SubscriptionCheckoutModal from '../SubscriptionCheckoutModal'

const plan = { id: 'p1', name: 'Premium', price_monthly: 999, price_annually: 9990 }
const quote = (finalAmount, extra = {}) => ({ code: 'CODE', originalAmount: 999, finalAmount, discountAmount: 999 - finalAmount, message: 'CODE applied', ...extra })

function open(props = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<SubscriptionCheckoutModal open plan={plan} cycle="monthly" onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}
async function apply(code = 'code') {
  fireEvent.change(screen.getByPlaceholderText('Promo Code'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  await waitFor(() => expect(subscriptionApi.validatePromo).toHaveBeenCalled())
}

describe('SubscriptionCheckoutModal', () => {
  let RazorpayCtor
  beforeEach(() => {
    vi.clearAllMocks()
    RazorpayCtor = vi.fn(function () { this.on = vi.fn(); this.open = vi.fn() })
    window.Razorpay = RazorpayCtor
    loadRazorpay.mockResolvedValue(RazorpayCtor)
  })
  afterEach(() => { delete window.Razorpay })

  it('a 100% code: button says "Activate for free", the server activates, and Razorpay is never touched', async () => {
    subscriptionApi.validatePromo.mockResolvedValue(quote(0, { isFree: true }))
    subscriptionApi.createOrder.mockResolvedValue({ success: true, free: true, subscription: { id: 's' } })
    const { onClose, onSuccess } = open()
    await apply()
    const button = await screen.findByRole('button', { name: 'Activate for free' })
    fireEvent.click(button)

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(subscriptionApi.createOrder).toHaveBeenCalledWith({ planId: 'p1', cycle: 'monthly', couponCode: 'CODE' })
    expect(loadRazorpay).not.toHaveBeenCalled()
    expect(RazorpayCtor).not.toHaveBeenCalled()
    expect(subscriptionApi.verifyPayment).not.toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('free with your promo code'))
  })

  it('a partial code still opens Razorpay with the server\'s order and the public key id', async () => {
    subscriptionApi.validatePromo.mockResolvedValue(quote(499.5))
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 49950, currency: 'INR', key_id: 'rzp_test_public' })
    open()
    await apply()
    fireEvent.click(await screen.findByRole('button', { name: /Pay ₹499.50/ }))
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    const options = RazorpayCtor.mock.calls[0][0]
    expect(options).toMatchObject({ key: 'rzp_test_public', amount: 49950, currency: 'INR', order_id: 'order_1', theme: { color: '#6D28D9' } })
    expect(options.prefill.email).toBe('u@example.test')
    expect(JSON.stringify(options)).not.toMatch(/secret/i)
    expect(typeof options.handler).toBe('function')
    expect(typeof options.modal.ondismiss).toBe('function')
  })

  it('on payment success the handler verifies on the server, then refreshes and closes', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 99900, currency: 'INR', key_id: 'rzp_test_public' })
    subscriptionApi.verifyPayment.mockResolvedValue({ success: true })
    const { onSuccess, onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    await RazorpayCtor.mock.calls[0][0].handler({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' })
    expect(subscriptionApi.verifyPayment).toHaveBeenCalledWith({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' })
    expect(refresh).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('a failed verification tells the customer what to do and quotes the payment id', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 99900, currency: 'INR', key_id: 'k' })
    subscriptionApi.verifyPayment.mockRejectedValue({ response: { status: 400, data: { error: 'Payment could not be verified' } } })
    const { onSuccess } = open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    await RazorpayCtor.mock.calls[0][0].handler({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_9', razorpay_signature: 'x' })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('pay_9'))
  })

  it('dismissing the popup re-enables the button and a failed payment shows the gateway reason', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 99900, currency: 'INR', key_id: 'k' })
    open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    const instance = RazorpayCtor.mock.instances[0]
    const failedCb = instance.on.mock.calls.find(([event]) => event === 'payment.failed')[1]
    failedCb({ error: { description: 'Your card was declined' } })
    expect(toast.error).toHaveBeenCalledWith('Your card was declined')
    RazorpayCtor.mock.calls[0][0].modal.ondismiss()
    await waitFor(() => expect(screen.getByRole('button', { name: /Pay ₹999/ })).not.toBeDisabled())
  })

  it('closing the Razorpay popup ("Yes, exit") shows "Payment cancelled" as a toast and inline, even after the dialog has closed', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 99900, currency: 'INR', key_id: 'k' })
    const { rerender } = render(<SubscriptionCheckoutModal open plan={plan} cycle="monthly" onClose={vi.fn()} onSuccess={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Pay ₹999/ })[0])
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    const { ondismiss } = RazorpayCtor.mock.calls[0][0].modal

    // The customer exits inside the popup while the dialog behind it is still open: inline note + toast.
    ondismiss()
    expect(toast.info).toHaveBeenCalledWith('Payment cancelled. You have not been charged.')
    expect(await screen.findByText('Payment cancelled. You have not been charged.')).toBeTruthy()

    // The dialog may already be gone (parent closed it): the toast still fires and nothing throws.
    toast.info.mockClear()
    rerender(<SubscriptionCheckoutModal open={false} plan={plan} cycle="monthly" onClose={vi.fn()} onSuccess={vi.fn()} />)
    expect(() => ondismiss()).not.toThrow()
    expect(toast.info).toHaveBeenCalledWith('Payment cancelled. You have not been charged.')
  })

  it('does not call a successful payment "cancelled" when the popup closes after paying', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 99900, currency: 'INR', key_id: 'k' })
    subscriptionApi.verifyPayment.mockResolvedValue({ success: true })
    open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    const options = RazorpayCtor.mock.calls[0][0]
    await options.handler({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 's' })
    toast.info.mockClear()
    options.modal.ondismiss()
    expect(toast.info).not.toHaveBeenCalledWith('Payment cancelled. You have not been charged.')
  })

  it('the dialog cannot be closed from behind the Razorpay popup (outside click / Escape) while a payment is in progress', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'order_1', amount: 99900, currency: 'INR', key_id: 'k' })
    const { onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(RazorpayCtor).toHaveBeenCalled())
    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape', code: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('order creation errors are shown, and nothing opens', async () => {
    subscriptionApi.createOrder.mockRejectedValue({ response: { status: 400, data: { error: 'This promo code is not valid' } } })
    open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This promo code is not valid'))
    expect(RazorpayCtor).not.toHaveBeenCalled()
  })

  it('if the checkout script cannot be loaded the customer is told, not left hanging', async () => {
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'o', amount: 99900, currency: 'INR', key_id: 'k' })
    loadRazorpay.mockRejectedValue(new Error('The payment window could not be loaded.'))
    open()
    fireEvent.click(screen.getByRole('button', { name: /Pay ₹999/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('The payment window could not be loaded.'))
    expect(screen.getByRole('button', { name: /Pay ₹999/ })).not.toBeDisabled()
  })
})
