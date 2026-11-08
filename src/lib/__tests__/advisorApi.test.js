import { vi } from 'vitest'

vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

import apiClient from '@/lib/apiClient'
import { openPrivateFile, advisorApi } from '../advisorApi'

const KEY = 'private/11111111-1111-4111-8111-111111111111/sebi-certificates/abc-cert.pdf'

describe('openPrivateFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:cert')
    URL.revokeObjectURL = vi.fn()
    window.open = vi.fn()
    apiClient.get.mockResolvedValue({ data: new Blob(['x']) })
  })

  it('requests only /files/view/<key> through the shared client and opens a blob URL', async () => {
    await openPrivateFile(KEY)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get).toHaveBeenCalledWith(`/files/view/${KEY}`, { responseType: 'blob' })
    expect(window.open).toHaveBeenCalledWith('blob:cert', '_blank', 'noopener')
  })

  it.each([
    'https://evil.example/api/files/view/' + KEY,
    '/api/auth/me',
    'public/avatars/a.png',
    'private/u1/sebi-certificates/../../etc/passwd',
    'private/u1/sebi-certificates/a.pdf?x=1',
    '',
    null,
    undefined,
  ])('refuses %s without sending any request', async (bad) => {
    await expect(openPrivateFile(bad)).rejects.toThrow()
    expect(apiClient.get).not.toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })

  it('does not fall back to opening a raw URL when the request fails', async () => {
    apiClient.get.mockRejectedValue(new Error('network'))
    await expect(openPrivateFile(KEY)).rejects.toThrow('network')
    expect(window.open).not.toHaveBeenCalled()
  })
})

describe('advisorApi.stockSummary', () => {
  it('uses the public summary endpoint and encodes the symbol', async () => {
    apiClient.get.mockResolvedValue({ data: { buy: 1 } })
    await advisorApi.stockSummary('M&M')
    expect(apiClient.get).toHaveBeenCalledWith('/advisors/recommendations/stock/M%26M/summary')
  })
})
