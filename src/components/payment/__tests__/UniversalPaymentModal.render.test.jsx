import { render, screen } from '@testing-library/react'
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
})
