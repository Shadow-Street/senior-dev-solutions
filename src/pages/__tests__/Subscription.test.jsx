import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
const sub = { current: { plan_type: 'Free', status: 'active', is_free: true } }
vi.mock('@/components/hooks/useSubscription', () => ({ useSubscription: () => ({ subscription: sub.current, refreshSubscription: vi.fn() }) }))
vi.mock('@/components/subscription/SubscriptionCheckoutModal', () => ({ default: () => null }))
vi.mock('@/components/subscription/CurrentSubscriptionCard', () => ({ default: () => <div>current-card</div> }))
vi.mock('@/components/subscription/PlanCard', () => ({ default: (props) => <div data-testid="plan">{props.plan.name}{props.recommended ? ' (popular)' : ''}</div> }))

import apiClient from '@/lib/apiClient'
import SubscriptionPage from '../Subscription'

const plans = [
  { id: 'f', name: 'Free', price_monthly: 0, price_annually: 0 },
  { id: 'p', name: 'Premium', price_monthly: 999, price_annually: 9990 },
  { id: 'v', name: 'VIP', price_monthly: 1999, price_annually: 19990 },
]
const renderPage = () => render(<MemoryRouter><SubscriptionPage /></MemoryRouter>)

describe('Subscription page states', () => {
  beforeEach(() => { vi.clearAllMocks(); sub.current = { plan_type: 'Free', status: 'active', is_free: true } })

  it('shows the plans, with Premium recommended, and no billing history on this page', async () => {
    apiClient.get.mockResolvedValue({ data: plans })
    renderPage()
    expect(await screen.findAllByTestId('plan')).toHaveLength(3)
    expect(screen.getByText('Premium (popular)')).toBeTruthy()
    expect(screen.queryByText(/Billing history/i)).toBeNull()
  })

  it('a failed fetch shows an error card with Retry (not just a toast and an empty grid); Retry reloads', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network'))
    renderPage()
    expect(await screen.findByText('Plans could not be loaded')).toBeTruthy()
    expect(screen.queryAllByTestId('plan')).toHaveLength(0)
    apiClient.get.mockResolvedValueOnce({ data: plans })
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
    expect(await screen.findAllByTestId('plan')).toHaveLength(3)
    expect(screen.queryByText('Plans could not be loaded')).toBeNull()
  })

  it('zero plans is an empty state, not a blank grid', async () => {
    apiClient.get.mockResolvedValue({ data: [] })
    renderPage()
    expect(await screen.findByText('No plans are available right now')).toBeTruthy()
  })

  it('a paid-looking subscription with no plan_type does not crash the page', async () => {
    sub.current = { status: 'active', end_date: '2020-01-01T00:00:00Z' }
    apiClient.get.mockResolvedValue({ data: plans })
    expect(() => renderPage()).not.toThrow()
    await waitFor(() => expect(screen.getAllByTestId('plan').length).toBe(3))
  })

  it('the Monthly/Yearly toggle is a pressed-state button group, selected filled primary with white text', async () => {
    apiClient.get.mockResolvedValue({ data: plans })
    renderPage()
    await screen.findAllByTestId('plan')
    const monthly = screen.getByRole('button', { name: 'Monthly' })
    const yearly = screen.getByRole('button', { name: /Yearly/ })
    expect(monthly.getAttribute('aria-pressed')).toBe('true')
    expect(monthly.className).toContain('bg-primary')
    expect(monthly.className).toContain('text-white')
    fireEvent.click(yearly)
    expect(yearly.getAttribute('aria-pressed')).toBe('true')
    expect(yearly.className).toContain('bg-primary')
    expect(monthly.getAttribute('aria-pressed')).toBe('false')
    expect(monthly.className).toContain('text-primary')
  })
})
