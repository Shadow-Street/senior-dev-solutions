import { vi } from 'vitest'

vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

import apiClient from '@/lib/apiClient'
import { advisorApi } from '../advisorApi'

describe('advisorApi.stockSummary', () => {
  it('uses the public summary endpoint and encodes the symbol', async () => {
    apiClient.get.mockResolvedValue({ data: { buy: 1 } })
    await advisorApi.stockSummary('M&M')
    expect(apiClient.get).toHaveBeenCalledWith('/advisors/recommendations/stock/M%26M/summary')
  })
})
