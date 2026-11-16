import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'

// Regression: the modal called useRef without importing it, so it threw a
// ReferenceError on every render (open or closed) and took down advisor-plan
// checkout and ticket purchase. Nothing rendered it under test before.
vi.mock('@/lib/subscriptionApi', () => ({
  subscriptionApi: { createOrder: vi.fn(), verifyPayment: vi.fn() },
  apiErrorMessage: () => 'error',
  rupees: (n) => `₹${n}`,
  loadRazorpay: vi.fn(),
}))

const { default: UniversalPaymentModal } = await import('../UniversalPaymentModal')

describe('UniversalPaymentModal', () => {
  it('renders closed without throwing', () => {
    expect(() => render(<UniversalPaymentModal open={false} onClose={() => {}} amount={500} />)).not.toThrow()
  })

  it('renders open with a plan and shows the pay action', () => {
    render(
      <UniversalPaymentModal open onClose={() => {}} amount={500} planId="plan-1" description="Advisor plan"
        customerInfo={{ name: 'Test', email: 't@example.test' }} />
    )
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('hides itself while Razorpay is open so the gateway fields take input, and returns on dismiss', async () => {
    const { subscriptionApi, loadRazorpay } = await import('@/lib/subscriptionApi')
    subscriptionApi.createOrder.mockResolvedValue({ success: true, order_id: 'o1', amount: 50000, currency: 'INR', key_id: 'k' })
    loadRazorpay.mockResolvedValue()
    const Ctor = vi.fn(function () { this.on = vi.fn(); this.open = vi.fn() })
    window.Razorpay = Ctor
    const onClose = vi.fn()
    render(
      <UniversalPaymentModal open onClose={onClose} amount={500} planId="plan-1" description="Advisor plan"
        customerInfo={{ name: 'Test', email: 't@example.test' }} />
    )
    fireEvent.click(screen.getByRole('button', { name: /Pay/ }))
    await waitFor(() => expect(Ctor).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(Ctor.mock.calls[0][0].prefill).toMatchObject({ email: 't@example.test' })

    act(() => Ctor.mock.calls[0][0].modal.ondismiss())
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toMatch(/cancelled/i)
    expect(onClose).not.toHaveBeenCalled()
    delete window.Razorpay
  })
})
