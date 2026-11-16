import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { vi } from 'vitest'

// jsdom lacks these; Radix Select calls them when it opens.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/withdrawalsApi', async (importOriginal) => ({ ...(await importOriginal()), withdrawalsApi: { summary: vi.fn() } }))
vi.mock('@/lib/apiClient', () => ({ Review: { filter: vi.fn() }, default: { get: vi.fn() } }))
vi.mock('@/lib/advisorApi', () => ({ advisorApi: { plans: vi.fn(), usage: vi.fn() } }))

import { advisorApi } from '@/lib/advisorApi'
import CreatePostModal from '../CreatePostModal'

const counter = (used, cap) => ({ used, cap, remaining: cap === null ? null : Math.max(cap - used, 0), starts_at: '2026-11-08T18:30:00.000Z', resets_at: '2026-11-15T18:30:00.000Z' })
const PLANS = [
  { id: 'p1', name: 'Basic', price: '500', is_active: true },
  { id: 'p2', name: 'Pro', price: '1500', is_active: true },
]
const usage = (basicWeek) => ({
  plans: [
    { plan_id: 'p1', plan_name: 'Basic', price: 500, is_active: true, limit_count: 2, limit_period: 'week', week: counter(basicWeek, 2), month: { ...counter(basicWeek, 8), resets_at: '2026-11-30T18:30:00.000Z' } },
    { plan_id: 'p2', plan_name: 'Pro', price: 1500, is_active: true, limit_count: null, limit_period: null, week: counter(0, null), month: counter(0, null) },
  ],
  counted_plan_ids: [],
})

function mount(onSubmit = vi.fn(), editingPost = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><CreatePostModal open onClose={() => {}} onSubmit={onSubmit} editingPost={editingPost} /></QueryClientProvider>)
  return onSubmit
}

describe('CreatePostModal allowance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    advisorApi.plans.mockResolvedValue(PLANS)
  })

  it('shows what is left for the audience and keeps Publish enabled', async () => {
    advisorApi.usage.mockResolvedValue(usage(1))
    mount()
    expect(await screen.findByTestId('post-allowance')).toHaveTextContent('1 recommendation left for this audience (Basic)')
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
  })

  it('disables Publish (not Save draft) when the allowance is used up, and says when it resets', async () => {
    advisorApi.usage.mockResolvedValue(usage(2))
    mount()
    const note = await screen.findByTestId('post-allowance')
    expect(note).toHaveTextContent('Basic has used 2 of 2 recommendations this week. It resets on Mon 16 Nov.')
    expect(note).toHaveTextContent('You can still save a draft')
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeEnabled()
  })

  it('a Pro-only audience is not blocked by an exhausted Basic plan', async () => {
    advisorApi.usage.mockResolvedValue(usage(2))
    mount()
    await screen.findByTestId('post-allowance')
    fireEvent.click(screen.getByRole('combobox', { name: /plan required/i }))
    fireEvent.click(await screen.findByRole('option', { name: /Pro and above/ }))
    await waitFor(() => expect(screen.queryByTestId('post-allowance')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
  })

  it('a public audience spends nothing, so nothing is shown', async () => {
    advisorApi.usage.mockResolvedValue(usage(2))
    mount()
    await screen.findByTestId('post-allowance')
    fireEvent.click(screen.getByRole('radio', { name: /Public/ }))
    await waitFor(() => expect(screen.queryByTestId('post-allowance')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
  })

  it('the tracker being unavailable (503) never blocks publishing', async () => {
    advisorApi.usage.mockRejectedValue({ response: { status: 503 } })
    mount()
    await waitFor(() => expect(advisorApi.usage).toHaveBeenCalled())
    expect(screen.queryByTestId('post-allowance')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()
  })

  it('surfaces the server 409 message next to the buttons', async () => {
    advisorApi.usage.mockResolvedValue(usage(0))
    const err = { response: { status: 409, data: { error: 'Basic has used 2 of 2 recommendations this week. It resets on Mon 16 Nov.' } } }
    mount(vi.fn().mockRejectedValue(err))
    await screen.findByTestId('post-allowance')
    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Buy Apple' } })
    fireEvent.change(screen.getByLabelText('Content *'), { target: { value: 'Because.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText(/It resets on Mon 16 Nov/)).toBeInTheDocument()
  })

  it('editing a live post: plans it already reaches are not spent, so Publish stays enabled', async () => {
    advisorApi.usage.mockResolvedValue(usage(2))
    mount(vi.fn(), { id: 'x1', title: 'Old call', content: 'c', status: 'published', visibility: 'subscribers', post_type: 'recommendation', recommendation_type: 'buy', required_plan_id: null })
    await waitFor(() => expect(advisorApi.usage).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByTestId('post-allowance')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Save & publish' })).toBeEnabled()
  })

  it('editing a live Pro-only post and widening to Basic (full) is blocked', async () => {
    advisorApi.usage.mockResolvedValue(usage(2))
    mount(vi.fn(), { id: 'x1', title: 'Old call', content: 'c', status: 'published', visibility: 'subscribers', post_type: 'recommendation', recommendation_type: 'buy', required_plan_id: 'p2' })
    await waitFor(() => expect(advisorApi.usage).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Save & publish' })).toBeEnabled()
    fireEvent.click(screen.getByRole('combobox', { name: /plan required/i }))
    fireEvent.click(await screen.findByRole('option', { name: /Basic and above/ }))
    expect(await screen.findByTestId('post-allowance')).toHaveTextContent('Basic has used 2 of 2')
    expect(screen.getByRole('button', { name: 'Save & publish' })).toBeDisabled()
  })

  it('a stock call filed as analysis (symbol + target) still counts', async () => {
    advisorApi.usage.mockResolvedValue(usage(2))
    mount()
    await screen.findByTestId('post-allowance')
    fireEvent.click(screen.getByRole('combobox', { name: /post type/i }))
    fireEvent.click(await screen.findByRole('option', { name: /Market analysis/ }))
    expect(screen.queryByTestId('post-allowance')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Stock symbol'), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText(/Target price/), { target: { value: '120' } })
    expect(await screen.findByTestId('post-allowance')).toHaveTextContent('has used 2 of 2')
  })
})
