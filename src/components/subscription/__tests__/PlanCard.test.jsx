import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/subscriptionApi', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, subscriptionApi: { validatePromo: vi.fn() } }
})

import { subscriptionApi } from '@/lib/subscriptionApi'
import { toast } from 'sonner'
import PlanCard from '@/components/subscription/PlanCard'

const plan = { id: 'p1', name: 'Premium', price_monthly: 999, price_annually: 9990, features: [] }
const user = { id: 'u1' }
const quote = (finalAmount, discountAmount) => ({ code: 'NEW50', originalAmount: finalAmount + discountAmount, finalAmount, discountAmount, message: 'NEW50 applied: 50% off' })

function renderCard(cycle) {
  const view = render(<PlanCard plan={plan} user={user} cycle={cycle} currentPlanTier="Free" onSelect={() => {}} />)
  return view
}

async function applyCode() {
  // the promo box is collapsed until asked for
  fireEvent.click(screen.getByRole('button', { name: /Have a promo code/ }))
  fireEvent.change(screen.getByPlaceholderText('Enter code'), { target: { value: 'new50' } })
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  await waitFor(() => expect(subscriptionApi.validatePromo).toHaveBeenCalledTimes(2))
}

describe('PlanCard promo code', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the server-discounted price, never NaN, and re-prices when the cycle toggles', async () => {
    subscriptionApi.validatePromo.mockImplementation(async ({ cycle }) => (cycle === 'annually' ? quote(4995, 4995) : quote(499.5, 499.5)))
    const { rerender, container } = renderCard('monthly')
    await applyCode()

    await waitFor(() => expect(screen.getAllByText('₹499.50').length).toBeGreaterThan(0))
    expect(container.textContent).not.toMatch(/NaN/)
    expect(toast.success).toHaveBeenCalledWith('NEW50 applied: 50% off')
    // the server is asked about this plan and each cycle, by code - the client sends no price
    expect(subscriptionApi.validatePromo).toHaveBeenCalledWith({ code: 'NEW50', planId: 'p1', cycle: 'monthly' })
    expect(subscriptionApi.validatePromo).toHaveBeenCalledWith({ code: 'NEW50', planId: 'p1', cycle: 'annually' })

    rerender(<PlanCard plan={plan} user={user} cycle="annually" currentPlanTier="Free" onSelect={() => {}} />)
    expect(screen.getAllByText('₹4,995').length).toBeGreaterThan(0)
    expect(container.textContent).not.toMatch(/NaN/)
  })

  it('shows the server error and keeps the list price when the code is refused', async () => {
    subscriptionApi.validatePromo.mockRejectedValue({ response: { data: { error: 'This promo code has expired' } } })
    const { container } = renderCard('monthly')
    await applyCode()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('This promo code has expired'))
    expect(toast.error).toHaveBeenCalledWith('This promo code has expired')
    expect(container.textContent).toContain('₹999')
    expect(container.textContent).not.toMatch(/NaN/)
  })

  it('passes the applied code to checkout with the selected cycle', async () => {
    subscriptionApi.validatePromo.mockImplementation(async () => quote(499.5, 499.5))
    const onSelect = vi.fn()
    render(<PlanCard plan={plan} user={user} cycle="monthly" currentPlanTier="Free" onSelect={onSelect} />)
    await applyCode()
    await waitFor(() => expect(screen.getByText(/NEW50 applied/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /^Upgrade$/ }))
    expect(onSelect).toHaveBeenCalledWith(plan, 'monthly', 'NEW50')
  })
})

describe('PlanCard layout states', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the promo box collapsed until asked for', () => {
    renderCard('monthly')
    expect(screen.queryByPlaceholderText('Enter code')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Have a promo code/ }))
    expect(screen.getByPlaceholderText('Enter code')).toBeTruthy()
  })

  it('marks the recommended plan and the current plan', () => {
    const { rerender } = render(<PlanCard plan={plan} user={user} cycle="monthly" currentPlanTier="Free" recommended onSelect={() => {}} />)
    expect(screen.getByText('Most popular')).toBeTruthy()
    rerender(<PlanCard plan={plan} user={user} cycle="monthly" currentPlanTier="Premium" isCurrentPlan onSelect={() => {}} />)
    expect(screen.getByText('Your plan')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Current plan/ })).toBeDisabled()
  })

  it('shows yearly pricing with the saving and per-month equivalent', () => {
    const { container } = renderCard('annually')
    expect(container.textContent).toContain('₹9,990')
    expect(container.textContent).toContain('/year')
    expect(container.textContent).toMatch(/Save 17%/)
    expect(container.textContent).toContain('₹832.50/month, billed yearly')
  })

  it('a free plan shows ₹0 forever and no promo box', () => {
    const free = { id: 'f', name: 'Free', price_monthly: 0, price_annually: 0, features: ['market_news'] }
    const { container } = render(<PlanCard plan={free} user={user} cycle="monthly" currentPlanTier="Free" isCurrentPlan onSelect={() => {}} />)
    expect(container.textContent).toContain('₹0')
    expect(container.textContent).toContain('forever')
    expect(screen.queryByRole('button', { name: /promo code/i })).toBeNull()
  })

  it('a 100% code relabels the call to action and shows the plan as free', async () => {
    subscriptionApi.validatePromo.mockImplementation(async () => ({ code: 'FREE100', originalAmount: 999, finalAmount: 0, discountAmount: 999, isFree: true, message: 'FREE100 applied: this plan is free with your code' }))
    const { container } = renderCard('monthly')
    await applyCode()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Activate for free' })).toBeTruthy())
    expect(container.textContent).toContain('Free with your promo code')
    expect(container.textContent).not.toMatch(/NaN/)
  })

  it('summarises inherited features and offers the rest on request', () => {
    const many = { ...plan, features: ['a_one', 'a_two', 'a_three', 'a_four', 'a_five', 'a_six', 'a_seven', 'a_eight'] }
    render(<PlanCard plan={many} user={user} cycle="monthly" currentPlanTier="Free" onSelect={() => {}} />)
    expect(screen.getByText(/Everything in Free, plus/)).toBeTruthy()
    expect(screen.queryByText('A Seven')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Show 2 more features/ }))
    expect(screen.getByText('A Seven')).toBeTruthy()
  })
})
