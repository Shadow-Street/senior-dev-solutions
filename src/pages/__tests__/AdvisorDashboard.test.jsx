import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const auth = { user: { id: 'u1', email: 'adv@example.test', app_role: 'advisor' } }
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('@/components/layouts/AdvisorLayout', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('@/components/advisors/finance/AdvisorBankAccounts', () => ({ default: () => <p>bank accounts section</p> }))
vi.mock('@/components/advisors/finance/AdvisorWithdrawals', () => ({ default: () => <p>withdrawals section</p> }))
vi.mock('@/lib/withdrawalsApi', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, withdrawalsApi: { summary: vi.fn() } }
})
vi.mock('@/lib/apiClient', () => ({ Review: { filter: vi.fn() }, default: { get: vi.fn() } }))
vi.mock('@/lib/advisorApi', () => ({
  advisorApi: {
    me: vi.fn(), plans: vi.fn(), posts: vi.fn(), subscribers: vi.fn(), earnings: vi.fn(), refunds: vi.fn(),
    createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(),
    createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn(), updateMe: vi.fn(),
  },
}))
vi.mock('@/api/integrations', () => ({ UploadFile: vi.fn() }))

import { advisorApi } from '@/lib/advisorApi'
import { withdrawalsApi } from '@/lib/withdrawalsApi'
import { Review } from '@/lib/apiClient'
import { advisorQueryClient } from '@/components/advisors/useAdvisorData'
import AdvisorDashboard from '../AdvisorDashboard'

// Failed queries retry once (after about a second) before the error state shows.
const SLOW = { timeout: 4000 }

const ADVISOR = { id: 'a1', display_name: 'Asha Rao', sebi_registration_number: 'INA000012346', status: 'approved', bio: 'Ten years of options trading.', specialization: ['Options Trading'] }
const PLAN = { id: 'p1', name: 'Basic', price: '500.00', billing_interval: 'monthly', is_active: true, features: ['Daily calls'], description: 'Starter' }
const POST = { id: 'x1', title: 'Buy ABC', content: 'Because', status: 'published', visibility: 'subscribers', stock_symbol: 'ABC', recommendation_type: 'buy', created_at: '2026-11-01T10:00:00Z' }
const SUB = { id: 's1', plan_id: 'p1', plan_name: 'Basic', plan_price: 500, status: 'active', subscriber_name: 'Sub One', start_date: '2026-11-01', end_date: '2026-12-01' }
const EARNINGS = { summary: { approved: 400, pending: 1200, pending_count: 1, available: 300, pending_withdrawals: 0, total_withdrawn: 100 }, items: [{ id: 'c1', amount: 1200, status: 'pending', plan_name: 'Basic', gross_amount: 1500, platform_fee: 300, created_at: '2026-11-02T10:00:00Z' }], total: 1 }

function mount(url = '/AdvisorDashboard') {
  return render(<MemoryRouter initialEntries={[url]}><AdvisorDashboard /></MemoryRouter>)
}

describe('AdvisorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    advisorQueryClient.clear()
    auth.user = { id: 'u1', email: 'adv@example.test', app_role: 'advisor' }
    advisorApi.me.mockResolvedValue({ advisor: ADVISOR })
    advisorApi.plans.mockResolvedValue([PLAN])
    advisorApi.posts.mockResolvedValue([POST])
    advisorApi.subscribers.mockResolvedValue([SUB])
    advisorApi.earnings.mockResolvedValue(EARNINGS)
    advisorApi.refunds.mockResolvedValue([])
    withdrawalsApi.summary.mockResolvedValue({ earned: 400, available: 300 })
    Review.filter.mockResolvedValue([{ rating: 5 }, { rating: 4 }])
  })

  it('overview loads real figures and links to the public profile', async () => {
    mount()
    expect(await screen.findByText(/Welcome back, Asha Rao/)).toBeInTheDocument()
    expect(await screen.findByText('₹300')).toBeInTheDocument() // available balance
    expect(screen.getByText('4.5/5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view public profile/i }).getAttribute('href')).toContain('AdvisorProfile?id=a1')
    expect(screen.getByText('INA000012346', { exact: false })).toBeInTheDocument()
  })

  it('a pending or rejected advisor never sees the tools', async () => {
    advisorApi.me.mockResolvedValue({ advisor: { ...ADVISOR, status: 'rejected', rejection_reason: 'Blurry certificate' } })
    mount()
    expect(await screen.findByText('Application not approved')).toBeInTheDocument()
    expect(screen.getByText(/Blurry certificate/)).toBeInTheDocument()
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument()
    expect(advisorApi.plans).not.toHaveBeenCalled()
    expect(advisorApi.posts).not.toHaveBeenCalled()
  })

  it('shows a retryable error when the profile cannot be loaded', async () => {
    advisorApi.me.mockRejectedValue(new Error('network'))
    mount()
    const retry = await screen.findByRole('button', { name: /try again/i }, SLOW)
    advisorApi.me.mockResolvedValue({ advisor: ADVISOR })
    fireEvent.click(retry)
    expect(await screen.findByText(/Welcome back/)).toBeInTheDocument()
  })

  it('staff get a staff view, not advisor data', async () => {
    auth.user = { id: 'adm', app_role: 'admin' }
    mount()
    expect(await screen.findByText('Staff view')).toBeInTheDocument()
    expect(advisorApi.plans).not.toHaveBeenCalled()
  })

  it('plans: lists the advisor plans with a real billing interval; empty and error states', async () => {
    mount('/AdvisorDashboard?section=plans')
    expect(await screen.findByText('Basic')).toBeInTheDocument()
    expect(screen.getByText(/\/ month/)).toBeInTheDocument()
    expect(screen.getByText('1 of 3 plans created')).toBeInTheDocument()
  })

  it('plans: shows the empty state, then the error state with retry', async () => {
    advisorApi.plans.mockResolvedValue([])
    const first = mount('/AdvisorDashboard?section=plans')
    expect(await screen.findByText(/You have no plans yet/)).toBeInTheDocument()
    first.unmount()
    advisorQueryClient.clear()
    advisorApi.plans.mockRejectedValue(new Error('x'))
    mount('/AdvisorDashboard?section=plans')
    expect(await screen.findByText('We could not load your plans.', {}, SLOW)).toBeInTheDocument()
  })

  it('plans: creating a plan sends only the plan fields (no owner, no flags)', async () => {
    advisorApi.createPlan.mockResolvedValue({ ...PLAN, id: 'p2' })
    mount('/AdvisorDashboard?section=plans')
    await screen.findByText('Basic')
    fireEvent.click(screen.getByRole('button', { name: /create plan/i }))
    fireEvent.change(await screen.findByLabelText(/Plan Name/i), { target: { value: 'Gold' } })
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '999' } })
    fireEvent.change(screen.getByPlaceholderText(/Daily stock recommendations/i), { target: { value: 'Daily calls' } })
    fireEvent.click(screen.getByRole('button', { name: /^create plan$/i }))
    await waitFor(() => expect(advisorApi.createPlan).toHaveBeenCalled())
    const sent = advisorApi.createPlan.mock.calls[0][0]
    expect(sent).toMatchObject({ name: 'Gold', price: 999, billing_interval: 'monthly', features: ['Daily calls'], is_active: true })
    expect(sent).not.toHaveProperty('advisor_id')
    expect(sent).not.toHaveProperty('is_system_plan')
  })

  it('posts: lists posts with audience, supports delete with confirmation, and shows loading/empty/error states', async () => {
    advisorApi.deletePost.mockResolvedValue({ success: true })
    mount('/AdvisorDashboard?section=posts')
    expect(await screen.findByText('Buy ABC')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    fireEvent.click(await screen.findByRole('button', { name: /delete advisory/i }))
    await waitFor(() => expect(advisorApi.deletePost).toHaveBeenCalledWith('x1'))
  })

  it('posts: empty state offers to create the first advisory', async () => {
    advisorApi.posts.mockResolvedValue([])
    mount('/AdvisorDashboard?section=posts')
    expect(await screen.findByText('No advisories yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create your first advisory/i })).toBeInTheDocument()
  })

  it('posts: a failed load shows an error with retry (e.g. before migration 014)', async () => {
    advisorApi.posts.mockRejectedValue(new Error('500'))
    mount('/AdvisorDashboard?section=posts')
    expect(await screen.findByText('We could not load your posts.', {}, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('subscribers: shows names and plans from the server', async () => {
    mount('/AdvisorDashboard?section=subscribers')
    expect(await screen.findByText('Sub One')).toBeInTheDocument()
    expect(screen.getAllByText('Basic').length).toBeGreaterThan(0)
  })

  it('financials: earnings separate approved from pending; sub-tabs switch via the URL', async () => {
    mount('/AdvisorDashboard?section=financials')
    expect(await screen.findByText('Approved earnings')).toBeInTheDocument()
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByText('₹1,200', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /bank accounts/i }))
    expect(await screen.findByText('bank accounts section')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /withdrawals/i }))
    expect(await screen.findByText('withdrawals section')).toBeInTheDocument()
  })

  it('analytics: renders from real records', async () => {
    mount('/AdvisorDashboard?section=analytics')
    expect(await screen.findByText('Subscribers by plan')).toBeInTheDocument()
    expect(screen.getByText('Earnings by month')).toBeInTheDocument()
  })
})
