import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import apiClient from '@/lib/apiClient'
import SubscriptionUserManagement, { priceLabel, endDateLabel } from '../SubscriptionUserManagement'

// PPT slide 6: Super Admin › Subscriptions showed "Jan 1, 1970" as the end date
// of Free plans and "₹/mo" as every price.
const item = (over) => ({
  id: 's1', user: { id: 'u1', name: 'Armaan', email: 'a@example.test' }, plan_name: 'Free', is_advisor_plan: false,
  billing_cycle: 'monthly', price: 0, start_date: '2026-11-09T00:00:00.000Z', end_date: null, status: 'active',
  cancel_at_period_end: false, auto_renew: false, ...over,
})

describe('subscription list labels', () => {
  it('never renders the Unix epoch for a missing end date', () => {
    expect(endDateLabel(item())).toBe('Never (free plan)')
    expect(endDateLabel(item({ price: 199 }))).toBe('No end date')
    expect(endDateLabel(item({ end_date: '2026-12-09T00:00:00.000Z' }))).toMatch(/2026/)
  })

  it('prints the real price for the billing cycle', () => {
    expect(priceLabel(item())).toBe('Free')
    expect(priceLabel(item({ price: 199 }))).toBe('₹199/mo')
    expect(priceLabel(item({ price: 1999, billing_cycle: 'annually' }))).toBe('₹1,999/yr')
    expect(priceLabel(item({ price: null }))).toBe('—')
  })
})

describe('SubscriptionUserManagement', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists server results with counts and no 1970 dates', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { items: [item(), item({ id: 's2', plan_name: 'Premium', price: 199, end_date: '2026-12-09T00:00:00.000Z' })], total: 2, counts: { active: 2, cancelling: 0, cancelled: 0, expired: 1 } },
    })
    render(<SubscriptionUserManagement permissions={{ canEdit: true }} />)

    expect(await screen.findByText('Never (free plan)')).toBeInTheDocument()
    expect(screen.getByText('₹199/mo')).toBeInTheDocument()
    expect(screen.getByText('User Subscriptions (2)')).toBeInTheDocument()
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument()
    expect(screen.queryByText('₹/mo')).not.toBeInTheDocument()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/subscriptions/admin/users', expect.objectContaining({ params: expect.objectContaining({ status: 'all', page: 1 }) })))
  })

  it('shows an error state with retry when loading fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({ response: { data: { error: 'Could not load subscriptions' } } })
    render(<SubscriptionUserManagement permissions={{}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load subscriptions')
  })
})
