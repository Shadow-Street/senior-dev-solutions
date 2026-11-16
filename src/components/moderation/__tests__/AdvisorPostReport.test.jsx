import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Report entry point on the advisor profile: offered only on posts the viewer
// can read in full (never on locked subscriber previews) and never to the author.
const api = vi.hoisted(() => ({
  me: vi.fn(), getAdvisor: vi.fn(), plans: vi.fn(), subs: vi.fn(), reviews: vi.fn(), feed: vi.fn(),
}))
vi.mock('@/lib/apiClient', () => ({
  authAPI: { me: api.me },
  Advisor: { get: api.getAdvisor },
  AdvisorPlan: { filter: api.plans },
  AdvisorSubscription: { filter: api.subs },
  Review: { filter: api.reviews, create: vi.fn(), update: vi.fn() },
}))
vi.mock('@/lib/advisorApi', () => ({ advisorApi: { feed: api.feed } }))
vi.mock('@/lib/moderationApi', () => ({ moderationApi: { report: vi.fn() }, moderationErrorMessage: (e, f) => f }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../subscription/PaymentModal', () => ({ default: () => null }))

const { default: AdvisorProfile } = await import('@/pages/AdvisorProfile')

const ADVISOR = { id: 'a1', user_id: 'u-adv', display_name: 'Asha', status: 'approved', specialization: [] }
const posts = [
  { id: 'p-open', title: 'Open call', content: 'Public text', visibility: 'public', locked: false, created_date: '2026-11-01T00:00:00Z' },
  { id: 'p-locked', title: 'Pro call', visibility: 'subscribers', locked: true, created_date: '2026-11-01T00:00:00Z' },
]

const renderAt = () => render(<MemoryRouter initialEntries={['/AdvisorProfile?id=a1']}><AdvisorProfile /></MemoryRouter>)

describe('AdvisorProfile report button', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.getAdvisor.mockResolvedValue(ADVISOR)
    api.plans.mockResolvedValue([])
    api.subs.mockResolvedValue([])
    api.reviews.mockResolvedValue([])
    api.feed.mockResolvedValue(posts)
  })

  it('is offered on readable posts only and opens the report dialog', async () => {
    api.me.mockResolvedValue({ id: 'u-viewer', email: 'v@example.test' })
    renderAt()
    await screen.findByText('Open call')
    const buttons = screen.getAllByRole('button', { name: /report post/i })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Report post Open call')
    fireEvent.click(buttons[0])
    expect(await screen.findByRole('dialog', { name: /report post/i })).toBeInTheDocument()
  })

  it('is not offered to the advisor on their own posts', async () => {
    api.me.mockResolvedValue({ id: 'u-adv', email: 'adv@example.test' })
    renderAt()
    await screen.findByText('Open call')
    expect(screen.queryByRole('button', { name: /report post/i })).toBeNull()
  })
})
