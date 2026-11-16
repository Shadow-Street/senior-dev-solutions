import { render, screen, within, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import RecommendationUsageSection, { RecommendationUsageCard } from '../RecommendationUsage'
import { allowanceFor, exhaustedMessage, formatIstDate, limitLabel, countsAgainstLimit, reachedPlanIds } from '../usageHelpers'

const counter = (used, cap, resets = '2026-11-15T18:30:00.000Z') => ({
  used, cap, remaining: cap === null ? null : Math.max(cap - used, 0), starts_at: '2026-11-08T18:30:00.000Z', resets_at: resets,
})
const BASIC = { plan_id: 'p1', plan_name: 'Basic Stock Advisory', price: 500, is_active: true, limit_count: 2, limit_period: 'week', effective_from: '2026-11-02T04:00:00.000Z', week: counter(1, 2), month: counter(5, 8, '2026-11-30T18:30:00.000Z') }
const PRO = { plan_id: 'p2', plan_name: 'Pro', price: 1500, is_active: true, limit_count: null, limit_period: null, effective_from: null, week: counter(3, null), month: counter(9, null, '2026-11-30T18:30:00.000Z') }
const MONTHLY = { ...BASIC, plan_id: 'p3', plan_name: 'Monthly', limit_count: 10, limit_period: 'month', week: counter(4, null), month: counter(4, 10, '2026-11-30T18:30:00.000Z') }

describe('RecommendationUsageCard', () => {
  it('matches the mockup: plan, limit, week and month usage with bars, and remaining counts', () => {
    render(<RecommendationUsageCard plan={BASIC} />)
    expect(screen.getByText('My Advisor Plan')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Basic Stock Advisory')).toBeInTheDocument()
    expect(screen.getByText('2 recommendations / week')).toBeInTheDocument()
    expect(screen.getByText('Recommendation usage')).toBeInTheDocument()
    expect(screen.getByText('1/2 used')).toBeInTheDocument()
    expect(screen.getByText('5/8 used')).toBeInTheDocument()
    const week = screen.getByRole('progressbar', { name: 'This week usage' })
    expect(week).toHaveAttribute('aria-valuenow', '1')
    expect(week).toHaveAttribute('aria-valuemax', '2')
    expect(week.firstChild.style.width).toBe('50%')
    expect(screen.getByRole('progressbar', { name: 'This month usage' }).firstChild.style.width).toBe('63%')
    expect(screen.getByText('Monthly posts remaining').closest('p')).toHaveTextContent('3 Monthly posts remaining')
    expect(screen.getByText('Weekly posts remaining').closest('p')).toHaveTextContent('1 Weekly posts remaining')
    expect(screen.getByText(/Week resets Mon 16 Nov/)).toBeInTheDocument()
    expect(screen.getByText(/Month resets Tue 1 Dec/)).toBeInTheDocument()
    expect(screen.getByText(/Limit in force since/)).toBeInTheDocument()
  })

  it('a plan with no limit says Unlimited and draws no bars', () => {
    render(<RecommendationUsageCard plan={PRO} />)
    expect(screen.getByText('Unlimited recommendations')).toBeInTheDocument()
    expect(screen.getByText('Unlimited')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('3 posted')).toBeInTheDocument()
    expect(screen.queryByText(/posts remaining/)).not.toBeInTheDocument()
  })

  it('a monthly limit has a monthly bar and no weekly cap', () => {
    render(<RecommendationUsageCard plan={MONTHLY} />)
    expect(screen.getByText('10 recommendations / month')).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
    expect(within(screen.getByTestId('usage-week')).getByText('No cap')).toBeInTheDocument()
    expect(screen.queryByText('Weekly posts remaining')).not.toBeInTheDocument()
    expect(screen.getByText('Monthly posts remaining').closest('p')).toHaveTextContent('6 Monthly posts remaining')
  })

  it('a full plan is shown as used up and an inactive plan is marked', () => {
    render(<RecommendationUsageCard plan={{ ...BASIC, is_active: false, week: counter(2, 2) }} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('2/2 used')).toBeInTheDocument()
    expect(screen.getByText('Weekly posts remaining').closest('p')).toHaveTextContent('0 Weekly posts remaining')
  })
})

describe('RecommendationUsageSection', () => {
  it('renders one card per plan', () => {
    render(<RecommendationUsageSection query={{ data: { plans: [BASIC, PRO] } }} />)
    expect(screen.getAllByText('My Advisor Plan')).toHaveLength(2)
  })

  it('empty state asks the advisor to create a plan', () => {
    const onCreate = vi.fn()
    render(<RecommendationUsageSection query={{ data: { plans: [] } }} onCreatePlan={onCreate} />)
    expect(screen.getByText(/Create a plan to start tracking recommendations/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create a plan' }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('loading and error states', () => {
    const { rerender } = render(<RecommendationUsageSection query={{ isLoading: true }} />)
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    const refetch = vi.fn()
    rerender(<RecommendationUsageSection query={{ isError: true, error: { response: { status: 500 } }, refetch }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load your recommendation usage.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
    rerender(<RecommendationUsageSection query={{ isError: true, error: { response: { status: 503 } }, refetch }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Publishing still works')
  })
})

describe('usage helpers', () => {
  it('formats dates in India time', () => {
    expect(formatIstDate('2026-11-15T18:30:00.000Z')).toBe('Mon 16 Nov')
    expect(formatIstDate('2026-11-30T18:30:00.000Z')).toBe('Tue 1 Dec')
    expect(formatIstDate(null)).toBe('')
  })

  it('limit labels', () => {
    expect(limitLabel({ limit_count: 1, limit_period: 'week' })).toBe('1 recommendation / week')
    expect(limitLabel({ limit_count: null })).toBe('Unlimited recommendations')
  })

  it('allowance follows the server rule: required plan reaches itself and dearer plans', () => {
    const full = { ...BASIC, week: counter(2, 2) }
    const usage = { plans: [full, PRO] }
    // all subscribers: reaches Basic -> blocked
    expect(allowanceFor(usage, {}).blocked).toBe(true)
    expect(allowanceFor(usage, {}).blockedBy.plan_id).toBe('p1')
    // Pro-only does not reach Basic (Pro has no limit)
    expect(allowanceFor(usage, { requiredPlanId: 'p2' }).limited).toBe(false)
    expect(allowanceFor(usage, { requiredPlanId: 'p2' }).blocked).toBe(false)
    // Basic tier reaches Basic and Pro
    expect(allowanceFor(usage, { requiredPlanId: 'p1' }).blocked).toBe(true)
    // a post that already counted on Basic spends nothing there
    expect(allowanceFor(usage, { countedPlanIds: ['p1'] }).blocked).toBe(false)
    // tightest remaining
    expect(allowanceFor({ plans: [BASIC] }, {}).tightest.remaining).toBe(1)
  })

  it('exhausted message mirrors the server and prefers the month when it is the one that is full', () => {
    expect(exhaustedMessage({ ...BASIC, week: counter(2, 2) })).toBe('Basic Stock Advisory has used 2 of 2 recommendations this week. It resets on Mon 16 Nov.')
    expect(exhaustedMessage({ ...BASIC, week: counter(2, 2), month: counter(8, 8, '2026-11-30T18:30:00.000Z') })).toBe('Basic Stock Advisory has used 8 of 8 recommendations this month. It resets on Tue 1 Dec.')
  })
})

describe('countsAgainstLimit (mirrors the server rule)', () => {
  const base = { status: 'published', visibility: 'subscribers' }
  it('counts recommendations and stock calls filed under another type', () => {
    expect(countsAgainstLimit({ ...base, post_type: 'recommendation' })).toBe(true)
    expect(countsAgainstLimit({ ...base, post_type: 'analysis', recommendation_type: 'buy' })).toBe(true)
    expect(countsAgainstLimit({ ...base, post_type: 'analysis', stock_symbol: 'ABC', target_price: '120' })).toBe(true)
    expect(countsAgainstLimit({ ...base, post_type: 'update', stock_symbol: 'ABC', stop_loss: 90 })).toBe(true)
  })
  it('does not count drafts, public posts, plain analysis or a symbol without target/stop', () => {
    expect(countsAgainstLimit({ ...base, status: 'draft', post_type: 'recommendation' })).toBe(false)
    expect(countsAgainstLimit({ ...base, visibility: 'public', post_type: 'recommendation' })).toBe(false)
    expect(countsAgainstLimit({ ...base, post_type: 'analysis', recommendation_type: 'none' })).toBe(false)
    expect(countsAgainstLimit({ ...base, post_type: 'analysis', stock_symbol: 'ABC', target_price: '', stop_loss: '' })).toBe(false)
    expect(countsAgainstLimit(null)).toBe(false)
  })
  it('reachedPlanIds follows required plan and dearer', () => {
    const usage = { plans: [{ plan_id: 'a', price: 1 }, { plan_id: 'b', price: 2 }] }
    expect(reachedPlanIds(usage, null)).toEqual(['a', 'b'])
    expect(reachedPlanIds(usage, 'b')).toEqual(['b'])
  })
})
