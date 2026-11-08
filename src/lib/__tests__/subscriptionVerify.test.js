import { vi } from 'vitest'

vi.mock('@/lib/apiClient', () => ({ default: { post: vi.fn(), get: vi.fn() } }))

import apiClient from '@/lib/apiClient'
import { subscriptionApi } from '@/lib/subscriptionApi'

const payload = { razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' }
const pending = () => Object.assign(new Error('409'), { response: { status: 409, data: { pending: true } } })

describe('verifyPayment retries while the gateway is still capturing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retries a 409 pending response and then succeeds', async () => {
    apiClient.post.mockRejectedValueOnce(pending()).mockRejectedValueOnce(pending()).mockResolvedValueOnce({ data: { success: true } })
    const out = await subscriptionApi.verifyPayment(payload, { attempts: 4, delayMs: 0 })
    expect(out).toEqual({ success: true })
    expect(apiClient.post).toHaveBeenCalledTimes(3)
  })

  it('gives up after the attempts and surfaces the error', async () => {
    apiClient.post.mockRejectedValue(pending())
    await expect(subscriptionApi.verifyPayment(payload, { attempts: 2, delayMs: 0 })).rejects.toThrow('409')
    expect(apiClient.post).toHaveBeenCalledTimes(2)
  })

  it('does not retry a real failure', async () => {
    apiClient.post.mockRejectedValue(Object.assign(new Error('400'), { response: { status: 400, data: { error: 'Payment could not be verified' } } }))
    await expect(subscriptionApi.verifyPayment(payload, { attempts: 4, delayMs: 0 })).rejects.toThrow('400')
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })
})
