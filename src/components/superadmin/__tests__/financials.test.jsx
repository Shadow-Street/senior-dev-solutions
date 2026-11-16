import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
vi.mock('@/components/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/lib/financialsApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    financialsApi: {
      overview: vi.fn(), refunds: vi.fn(), refund: vi.fn(), approveRefund: vi.fn(), rejectRefund: vi.fn(),
      syncRefund: vi.fn(), transactions: vi.fn(), exportTransactions: vi.fn(),
    },
  }
})

import { useAuth } from '@/components/context/AuthContext'
import { financialsApi } from '@/lib/financialsApi'
import Overview from '../financials/Overview'
import Refunds from '../financials/Refunds'
import Transactions from '../financials/Transactions'

// recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const RANGE = { from: '2026-10-01', to: '2026-10-31' }

const OVERVIEW = {
  totals: {
    gross_collected: 13487, refunds: 999, net_revenue: 12488, other_income: 1000, total_revenue: 13488,
    discounts_given: 999, platform_earnings: 12088, advisor_platform_commission: 100, advisor_earnings: 400, free_activations: 1,
  },
  counts: { success: 3, pending: 1, failed: 1, refunds: 1 },
  breakdown: {
    platform_subscriptions: { gross: 12987, refunds: 999, net: 11988, transactions: 2, tiers: {
      basic: { gross: 0, refunds: 0, net: 0, transactions: 0 },
      premium: { gross: 999, refunds: 999, net: 0, transactions: 1 },
      vip: { gross: 11988, refunds: 0, net: 11988, transactions: 1 },
      other: { gross: 0, refunds: 0, net: 0, transactions: 0 },
    } },
    advisor_subscriptions: { gross: 500, refunds: 0, net: 500, transactions: 1 },
    other: { gross: 0, refunds: 0, net: 0, transactions: 0, recorded_income: 1000 },
  },
  attempts_recorded: true,
}

describe('Financials > Overview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the server totals as rupees for the chosen period (never NaN)', async () => {
    financialsApi.overview.mockResolvedValue(OVERVIEW)
    render(<Overview range={RANGE} />)
    expect(await screen.findByText('Total platform revenue')).toBeInTheDocument()
    expect(financialsApi.overview).toHaveBeenCalledWith(RANGE)
    expect(screen.getByText('₹13,488')).toBeInTheDocument()
    expect(screen.getAllByText('₹12,488').length).toBeGreaterThan(0)
    expect(screen.getByRole('row', { name: /Platform: VIP/ })).toHaveTextContent('₹11,988')
    expect(document.body.textContent).not.toMatch(/NaN/)
  })

  it('shows an error with a working retry', async () => {
    financialsApi.overview.mockRejectedValueOnce({ response: { data: { error: 'Start date must be YYYY-MM-DD' } } })
    financialsApi.overview.mockResolvedValueOnce(OVERVIEW)
    render(<Overview range={RANGE} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Start date must be YYYY-MM-DD')
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Total platform revenue')).toBeInTheDocument()
  })
})

const LIST = {
  total: 1, limit: 25, offset: 0,
  stats: { total: 1, pending: 1, processing: 0, processed: 0, failed: 0, rejected: 0, pending_amount: 999, refunded_total: 0 },
  items: [{ id: 'r1', status: 'pending', type: 'subscription', user_name: 'Asha', user_email: 'a@x.test', requested_amount: 999, payment_id: 'pay_PREM0001', created_at: '2026-10-20T00:00:00Z' }],
}
const DETAIL = {
  request: { ...LIST.items[0], reason: 'Not useful', settled: false },
  charges: [{ payment_id: 'pay_PREM0001', subscription_id: 's1', subscription_status: 'active', plan_name: 'Premium', amount: 999, refunded: 0, refundable: 999, date: '2026-10-10T00:00:00Z' }],
  history: [],
}

describe('Financials > Refunds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    financialsApi.refunds.mockResolvedValue(LIST)
    financialsApi.refund.mockResolvedValue(DETAIL)
  })

  it('a super admin approves after confirming; amount and payment go to the server', async () => {
    useAuth.mockReturnValue({ user: { app_role: 'super_admin' } })
    financialsApi.approveRefund.mockResolvedValue({ status: 'processed', refund_id: 'rfnd_1' })
    render(<Refunds />)
    fireEvent.click(await screen.findByRole('button', { name: /review refund request from asha/i }))
    const dialog = await screen.findByRole('dialog')
    const amount = await within(dialog).findByLabelText('Amount (₹)')
    expect(amount).toHaveValue('999')

    fireEvent.change(amount, { target: { value: '1200' } })
    expect(within(dialog).getByText(/At most ₹999 can be refunded/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /approve & refund/i })).toBeDisabled()

    fireEvent.change(amount, { target: { value: '500' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /approve & refund/i }))
    expect(financialsApi.approveRefund).not.toHaveBeenCalled() // confirmation step first
    fireEvent.click(within(dialog).getByRole('button', { name: /confirm refund/i }))
    await waitFor(() => expect(financialsApi.approveRefund).toHaveBeenCalledTimes(1))
    expect(financialsApi.approveRefund).toHaveBeenCalledWith('r1', expect.objectContaining({ payment_id: 'pay_PREM0001', amount: '500', cancel_subscription: false }))
  })

  it('an admin who is not super admin can only reject, with a reason', async () => {
    useAuth.mockReturnValue({ user: { app_role: 'admin' } })
    financialsApi.rejectRefund.mockResolvedValue({ status: 'rejected' })
    render(<Refunds />)
    fireEvent.click(await screen.findByRole('button', { name: /review refund request/i }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Not useful')
    expect(within(dialog).queryByRole('button', { name: /approve/i })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: /^reject$/i }))
    const confirm = within(dialog).getByRole('button', { name: /reject request/i })
    expect(confirm).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText(/reason for rejecting/i), { target: { value: 'Outside the refund window' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(financialsApi.rejectRefund).toHaveBeenCalledWith('r1', 'Outside the refund window'))
  })
})

describe('Financials > Transactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists transactions with status and gateway ids, and shows an empty state', async () => {
    financialsApi.transactions.mockResolvedValueOnce({
      total: 1, limit: 25, offset: 0, attempts_recorded: true,
      items: [{ id: 't1', record: 'attempt', status: 'failed', kind: 'platform', tier: 'vip', plan_name: 'VIP', user_name: 'Asha', user_email: 'a@x.test', amount: 2999, discount: 0, order_id: 'order_F1', error: 'Card declined', date: '2026-10-20T06:00:00Z' }],
    })
    const { unmount } = render(<Transactions range={RANGE} />)
    expect(await screen.findByText('Card declined')).toBeInTheDocument()
    expect(screen.getByText('order: order_F1')).toBeInTheDocument()
    expect(screen.getByText('₹2,999')).toBeInTheDocument()
    unmount()

    financialsApi.transactions.mockResolvedValue({ total: 0, limit: 25, offset: 0, items: [], attempts_recorded: true })
    render(<Transactions range={RANGE} />)
    expect(await screen.findByText('No transactions match')).toBeInTheDocument()
  })
})
