import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/api/entities', () => ({ SubscriptionPlan: { list: vi.fn().mockResolvedValue([{ id: 'p', name: 'Premium', features: ['premium_polls'] }]) } }))
vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/lib/subscriptionApi', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, subscriptionApi: { billing: vi.fn(), mine: vi.fn() } }
})

import apiClient from '@/lib/apiClient'
import { subscriptionApi } from '@/lib/subscriptionApi'
import ProfileBillingSection from '../ProfileBillingSection'
import ProfileSubscriptionSection from '../ProfileSubscriptionSection'

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

const freeBilling = { subscription: { id: 's', plan_name: 'Free', status: 'active', is_free: true, billing_cycle: null, start_date: '2026-01-01T00:00:00Z', end_date: null, renews: false }, last_payment: null }
const paidBilling = {
  subscription: { id: 's', plan_name: 'Premium', status: 'active', is_free: false, billing_cycle: 'annually', start_date: '2026-11-01T00:00:00Z', end_date: '2027-11-01T00:00:00Z', renews: false, list_price_monthly: 999, list_price_annually: 9990 },
  last_payment: { amount: 4995, discount_applied: 4995, coupon_used: 'NEW50', gateway: 'razorpay', reference: 'pay_••••3456', date: '2026-11-01T00:00:00Z' },
}

describe('Profile > Subscription: billing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Free plan: shows plan, no expiry, no payments, and an empty invoice list - without crashing', async () => {
    subscriptionApi.billing.mockResolvedValue(freeBilling)
    apiClient.get.mockResolvedValue({ data: [] })
    const { container } = renderIn(<ProfileBillingSection />)
    await waitFor(() => expect(screen.getByText('Included with your account. It never expires.')).toBeTruthy())
    expect(screen.getByText(/no payments/)).toBeTruthy()
    await waitFor(() => expect(screen.getByText('No invoices yet')).toBeTruthy())
    expect(container.textContent).not.toMatch(/NaN|undefined|Invalid Date/)
  })

  it('paid plan: dates, amount paid, gateway, masked reference, coupon and invoices', async () => {
    subscriptionApi.billing.mockResolvedValue(paidBilling)
    apiClient.get.mockResolvedValue({ data: [{ id: 'i1', invoice_number: 'INV-202611-0001', plan_name: 'Premium', total_amount: '4995.00', currency: 'INR', status: 'paid', issued_date: '2026-11-01T00:00:00Z' }] })
    const { container } = renderIn(<ProfileBillingSection />)
    await waitFor(() => expect(screen.getByText('INV-202611-0001')).toBeTruthy())
    const text = container.textContent
    expect(text).toContain('Premium')
    expect(text).toContain('₹4,995.00')
    expect(text).toContain('Razorpay')
    expect(text).toContain('pay_••••3456')
    expect(text).toContain('NEW50')
    expect(text).toMatch(/Expires/)
    expect(screen.getByRole('button', { name: /View invoice INV-202611-0001/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Download invoice INV-202611-0001/ })).toBeTruthy()
    expect(text).not.toMatch(/NaN|undefined|Invalid Date/)
  })

  it('a free (promo) activation is labelled as such', async () => {
    subscriptionApi.billing.mockResolvedValue({ ...paidBilling, last_payment: { ...paidBilling.last_payment, amount: 0, discount_applied: 999, gateway: 'coupon', coupon_used: 'FREE100' } })
    apiClient.get.mockResolvedValue({ data: [] })
    renderIn(<ProfileBillingSection />)
    await waitFor(() => expect(screen.getByText('Promo code (no payment)')).toBeTruthy())
  })

  it('shows retryable errors for plan details and for invoices', async () => {
    subscriptionApi.billing.mockRejectedValue(new Error('x'))
    apiClient.get.mockRejectedValue({ response: { data: { error: 'Billing history could not be loaded.' } } })
    renderIn(<ProfileBillingSection />)
    await waitFor(() => expect(screen.getByText('Your plan details could not be loaded.')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('Billing history could not be loaded.')).toBeTruthy())
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(2)
  })
})

describe('Profile > Subscription: features card (the toLocaleString crash)', () => {
  it('renders for exactly what my-subscription returns for a Free user: no price field, no end_date', async () => {
    const freeRow = { id: 's', plan_type: 'Free', status: 'active', end_date: null, is_free: true }
    expect(() => renderIn(<ProfileSubscriptionSection subscription={freeRow} />)).not.toThrow()
    await waitFor(() => expect(screen.getByText(/What your plan includes/)).toBeTruthy())
  })

  it('renders for a paid row without a price, and for a missing plan_type', async () => {
    expect(() => renderIn(<ProfileSubscriptionSection subscription={{ id: 's', plan_type: 'Premium', status: 'active', end_date: '2027-01-01T00:00:00Z' }} />)).not.toThrow()
    expect(() => renderIn(<ProfileSubscriptionSection subscription={{ id: 's', status: 'active' }} />)).not.toThrow()
  })
})
