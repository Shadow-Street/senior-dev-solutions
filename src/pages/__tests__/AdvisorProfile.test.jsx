import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/subscription/PaymentModal', () => ({ default: () => null }))
vi.mock('@/components/moderation/ReportContentDialog', () => ({ renderReportDialog: () => null }))
vi.mock('@/lib/advisorApi', () => ({ advisorApi: { feed: vi.fn() } }))
vi.mock('@/lib/apiClient', () => ({
  authAPI: { me: vi.fn() },
  Advisor: { get: vi.fn() },
  AdvisorPlan: { filter: vi.fn() },
  AdvisorSubscription: { filter: vi.fn() },
  Review: { filter: vi.fn() },
}))

import { advisorApi } from '@/lib/advisorApi'
import { authAPI, Advisor, AdvisorPlan, AdvisorSubscription, Review } from '@/lib/apiClient'
import AdvisorProfile from '../AdvisorProfile'

const ADVISOR = { id: 'a1', user_id: 'adv-user', display_name: 'Asha Rao', bio: 'Ten years of options trading.', specialization: [], follower_count: 3 }
const PLANS = [
  { id: 'p1', name: 'Basic', price: 500, billing_interval: 'monthly', is_active: true, features: ['Calls'], limit_count: 2, limit_period: 'week' },
  { id: 'p2', name: 'Premium', price: 1500, billing_interval: 'monthly', is_active: true, features: ['More'], limit_count: null, limit_period: null },
]
const FULL = [
  { id: 'x1', title: 'Buy Apple', content: 'Apple is cheap because of reasons.', post_type: 'recommendation', visibility: 'subscribers', required_plan_id: 'p1', required_plan_name: 'Basic', stock_symbol: 'APPLE', recommendation_type: 'buy', target_price: 120, stop_loss: 115, locked: false, created_date: '2026-11-10T10:00:00Z' },
]
const LOCKED = [
  { id: 'x1', title: null, post_type: 'recommendation', visibility: 'subscribers', required_plan_id: 'p1', required_plan_name: 'Basic', locked: true, created_date: '2026-11-10T10:00:00Z' },
]

function mount() {
  return render(<MemoryRouter initialEntries={['/AdvisorProfile?id=a1']}><AdvisorProfile /></MemoryRouter>)
}

describe('AdvisorProfile advisory posts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authAPI.me.mockResolvedValue(null)
    Advisor.get.mockResolvedValue(ADVISOR)
    AdvisorPlan.filter.mockResolvedValue(PLANS)
    AdvisorSubscription.filter.mockResolvedValue([])
    Review.filter.mockResolvedValue([])
    advisorApi.feed.mockResolvedValue(LOCKED)
  })

  it('a locked post shows a neutral teaser: no title, post type, date and the plan that unlocks it', async () => {
    mount()
    expect(await screen.findByText('Subscriber-only advisory')).toBeInTheDocument()
    expect(screen.getByText('Stock recommendation')).toBeInTheDocument()
    expect(screen.getByText('Available to subscribers on the Basic plan and above.')).toBeInTheDocument()
    expect(screen.getByText('Nov 10, 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Buy Apple/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('staff-notice')).not.toBeInTheDocument()
    expect(advisorApi.feed).toHaveBeenCalledWith('a1', { limit: 20 })
  })

  it('plan cards show the recommendation limit when set', async () => {
    mount()
    expect(await screen.findByTestId('plan-limit')).toHaveTextContent('2 recommendations / week')
    expect(screen.getAllByTestId('plan-limit')).toHaveLength(1)
  })

  it('an ordinary signed-in member sees no staff notice', async () => {
    authAPI.me.mockResolvedValue({ id: 'u9', email: 'm@example.test', app_role: 'premium' })
    mount()
    await screen.findByText('Subscriber-only advisory')
    expect(screen.queryByTestId('staff-notice')).not.toBeInTheDocument()
  })

  for (const [label, user] of [
    ['the advisor themself', { id: 'adv-user', app_role: 'advisor' }],
    ['a super admin', { id: 'sa', app_role: 'super_admin' }],
  ]) {
    it(`${label} gets the notice and can preview as a non-subscriber`, async () => {
      authAPI.me.mockResolvedValue(user)
      advisorApi.feed.mockResolvedValueOnce(FULL).mockResolvedValue(LOCKED)
      mount()
      expect(await screen.findByText('Apple is cheap because of reasons.')).toBeInTheDocument()
      expect(screen.getByTestId('staff-notice')).toHaveTextContent('You see every post because you are this advisor / staff. Members without a matching subscription see locked previews.')

      fireEvent.click(screen.getByRole('switch', { name: 'Preview as a non-subscriber' }))
      await waitFor(() => expect(advisorApi.feed).toHaveBeenLastCalledWith('a1', { limit: 20, preview: 'member' }))
      expect(await screen.findByText('Subscriber-only advisory')).toBeInTheDocument()
      expect(screen.queryByText('Buy Apple')).not.toBeInTheDocument()
      expect(screen.getByTestId('staff-notice')).toHaveTextContent('Previewing as a member without a subscription')

      // toggling back asks for the full feed again
      advisorApi.feed.mockResolvedValue(FULL)
      fireEvent.click(screen.getByRole('switch', { name: 'Preview as a non-subscriber' }))
      await waitFor(() => expect(advisorApi.feed).toHaveBeenLastCalledWith('a1', { limit: 20 }))
      expect(await screen.findByText('Buy Apple')).toBeInTheDocument()
    })
  }

  it('a sub_admin is not staff for advisor content, so no notice or toggle', async () => {
    authAPI.me.mockResolvedValue({ id: 'sub1', app_role: 'sub_admin' })
    mount()
    await screen.findByText('Subscriber-only advisory')
    expect(screen.queryByTestId('staff-notice')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('shows an error when the posts cannot be loaded', async () => {
    advisorApi.feed.mockRejectedValue(new Error('network'))
    mount()
    expect(await screen.findByText(/could not load advisory posts/i)).toBeInTheDocument()
  })
})
