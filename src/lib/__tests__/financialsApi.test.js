import { vi } from 'vitest'

vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

import apiClient from '@/lib/apiClient'
import { financialsApi, presetRange, toParams, monthLabel } from '../financialsApi'

describe('financials API helpers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds ranges in India time', () => {
    // 2026-10-31 20:00 UTC is already 1 Nov in India.
    const now = new Date('2026-10-31T20:00:00Z')
    expect(presetRange('this_month', now)).toEqual({ from: '2026-11-01', to: '2026-11-01' })
    expect(presetRange('last_month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(presetRange('this_year', now)).toEqual({ from: '2026-01-01', to: '2026-11-01' })
    expect(presetRange('last_30_days', now)).toEqual({ from: '2026-10-03', to: '2026-11-01' })
    expect(presetRange('last_month', new Date('2026-01-15T00:00:00Z'))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(presetRange('all', now)).toEqual({ from: '', to: '' })
  })

  it('drops empty and "all" filters from the query', () => {
    expect(toParams({ from: '2026-10-01', to: '' }, { status: 'all', kind: 'advisor', search: '' }, { limit: 25, offset: 0 }))
      .toEqual({ from: '2026-10-01', kind: 'advisor', limit: 25, offset: 0 })
  })

  it('labels months', () => {
    expect(monthLabel('2026-10')).toMatch(/Oct/)
    expect(monthLabel('bad')).toBe('bad')
  })

  it('sends refund actions to the server only (amount as text, no client status)', async () => {
    apiClient.post.mockResolvedValue({ data: { status: 'processed' } })
    await financialsApi.approveRefund('r1', { payment_id: 'pay_1', amount: '10.50' })
    expect(apiClient.post).toHaveBeenCalledWith('/financials/refunds/r1/approve', { payment_id: 'pay_1', amount: '10.50' })
    await financialsApi.rejectRefund('r1', 'Too late')
    expect(apiClient.post).toHaveBeenCalledWith('/financials/refunds/r1/reject', { reason: 'Too late' })
  })

  it('passes filters to the transactions endpoint', async () => {
    apiClient.get.mockResolvedValue({ data: { items: [] } })
    await financialsApi.transactions({ from: '2026-10-01', to: '2026-10-31' }, { status: 'failed', tier: 'all' }, { limit: 25, offset: 50 })
    expect(apiClient.get).toHaveBeenCalledWith('/financials/transactions', { params: { from: '2026-10-01', to: '2026-10-31', status: 'failed', limit: 25, offset: 50 } })
  })
})
