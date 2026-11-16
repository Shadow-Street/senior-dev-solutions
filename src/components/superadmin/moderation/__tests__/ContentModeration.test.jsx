import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), decide: vi.fn(), bulk: vi.fn(), history: vi.fn(), report: vi.fn(), flagBlockedMessage: vi.fn() }))
vi.mock('@/lib/moderationApi', () => ({
  moderationApi: api,
  moderationErrorMessage: (e, fallback) => e?.response?.data?.error || fallback,
  isMigrationPending: (e) => e?.response?.data?.code === 'MIGRATION_PENDING',
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const { default: ContentModeration } = await import('../../ContentModeration')
const { decisionLabel } = await import('../constants')

const AUTHOR = { id: 'u-author', name: 'Ravi Trader', email: 'ravi@example.test', status: 'active', role: 'user' }
const pendingReport = {
  id: 'r1', target_type: 'message', target_id: 'm1', target_user_id: AUTHOR.id, reporter_id: 'u-rep', source: 'user',
  reason: 'harassment', note: 'rude', severity: 'high', status: 'pending', decision: null,
  content_snapshot: '<img src=x onerror="alert(1)"> you are an idiot', context: { chat_room_id: 'room1' },
  created_at: '2026-11-01T10:00:00.000Z', target_user: AUTHOR, reporter: { id: 'u-rep', name: 'Reporter', email: 'rep@example.test' },
  room: { id: 'room1', name: 'Nifty Traders' },
}
const decidedReport = { ...pendingReport, id: 'r2', status: 'resolved', decision: 'warned', severity: 'low', reason: 'spam' }
const counts = { total: 2, pending: 1, escalated: 0, resolved: 1, dismissed: 0, critical: 0, high: 1, medium: 0, low: 1 }

const renderPage = () => render(<MemoryRouter><ContentModeration /></MemoryRouter>)

describe('Content Moderation', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    Object.values(toast).forEach((f) => f.mockClear())
    api.list.mockResolvedValue({ items: [pendingReport, decidedReport], total: 2, page: 1, limit: 20, counts })
    api.history.mockResolvedValue({ items: [], total: 0 })
    api.get.mockResolvedValue({
      report: pendingReport,
      target: { exists: true, removed: false },
      author: { warnings: 2, sanctions: [{ id: 's1', action: 'warn', reason: 'earlier spam', created_at: '2026-10-01T00:00:00.000Z', actor: { name: 'Admin' } }], reports: [] },
      actions: [],
    })
  })

  it('shows real counters and the decision in the Action line (hidden when there is none)', async () => {
    renderPage()
    expect(await screen.findAllByText('Ravi Trader', { selector: 'span' })).toHaveLength(2)
    expect(screen.getByTestId('count-total')).toHaveTextContent('2')
    expect(screen.getByTestId('count-pending')).toHaveTextContent('1')
    expect(screen.getByTestId('count-high')).toHaveTextContent('1')
    const rows = screen.getAllByRole('row')
    // rows[0] is the header; the pending report has no decision yet.
    expect(within(rows[1]).queryByText(/Action:/)).toBeNull()
    expect(within(rows[2]).getByText('User warned')).toBeInTheDocument()
    expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'open', page: 1 }))
  })

  it('maps decisions and auto-flags to labels', () => {
    expect(decisionLabel({ decision: null, source: 'user' })).toBeNull()
    expect(decisionLabel({ decision: null, source: 'auto' })).toBe('Blocked automatically')
    expect(decisionLabel({ decision: 'banned' })).toBe('User blocked')
  })

  it('renders reported content as text, never as HTML', async () => {
    renderPage()
    await screen.findAllByText(/you are an idiot/)
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })

  it('filters by severity and searches through the API', async () => {
    renderPage()
    await screen.findAllByText(/you are an idiot/)
    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'high' } })
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ severity: 'high' })))
    fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: 'idiot' } })
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'idiot' })), { timeout: 2000 })
  })

  it('shows the pending-migration message instead of an empty queue', async () => {
    api.list.mockRejectedValue({ response: { status: 503, data: { code: 'MIGRATION_PENDING' } } })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/migration 019/i)
  })

  it('review: shows prior warnings, requires a reason, confirms a suspension, then applies it', async () => {
    api.decide.mockResolvedValue({ id: 'r1', status: 'resolved', decision: 'suspended' })
    renderPage()
    await screen.findAllByText(/you are an idiot/)
    fireEvent.click(screen.getAllByRole('button', { name: /review report/i })[0])

    expect(await screen.findByText('2 prior warnings')).toBeInTheDocument()
    expect(screen.getByText(/earlier spam/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open room: nifty traders/i })).toHaveAttribute('href', expect.stringContaining('ChatRooms?roomId=room1'))

    fireEvent.click(screen.getByRole('button', { name: /suspend user/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm: suspend user/i }))
    expect(await screen.findByText(/a reason is required/i)).toBeInTheDocument()
    expect(api.decide).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/reason \(shown to the user\)/i), { target: { value: 'Repeated abuse' } })
    fireEvent.change(screen.getByLabelText(/suspension length/i), { target: { value: '400' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm: suspend user/i }))
    expect(await screen.findByText(/enter 1 to 365 days/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/suspension length/i), { target: { value: '14' } })
    fireEvent.click(screen.getByLabelText(/also remove the reported content/i))
    fireEvent.click(screen.getByRole('button', { name: /confirm: suspend user/i }))
    const confirm = await screen.findByRole('alertdialog')
    expect(api.decide).not.toHaveBeenCalled()
    fireEvent.click(within(confirm).getByRole('button', { name: /yes, continue/i }))
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith('r1', { action: 'suspend', reason: 'Repeated abuse', days: 14, alsoRemove: true }))
    expect(toast.success).toHaveBeenCalled()
  })

  it('review: approve needs no reason or confirmation', async () => {
    api.decide.mockResolvedValue({ id: 'r1', status: 'dismissed', decision: 'approved' })
    renderPage()
    await screen.findAllByText(/you are an idiot/)
    fireEvent.click(screen.getAllByRole('button', { name: /review report/i })[0])
    await screen.findByText('2 prior warnings')
    fireEvent.click(screen.getByRole('button', { name: /^approve/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm: approve/i }))
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith('r1', expect.objectContaining({ action: 'approve' })))
  })

  it('bulk: selects open reports only and rejects them in one call', async () => {
    api.bulk.mockResolvedValue({ succeeded: 1, failed: 0, results: [] })
    renderPage()
    await screen.findAllByText(/you are an idiot/)
    expect(screen.queryByLabelText('Select report r2')).toBeNull()
    fireEvent.click(screen.getByLabelText('Select report r1'))
    const bar = screen.getByRole('region', { name: /bulk actions/i })
    fireEvent.click(within(bar).getByRole('button', { name: /report rejected/i }))
    fireEvent.click(await screen.findByRole('button', { name: /apply to 1/i }))
    await waitFor(() => expect(api.bulk).toHaveBeenCalledWith({ ids: ['r1'], action: 'reject', reason: undefined }))
  })
})
