import { vi } from 'vitest'
import axios from 'axios'
import apiClient from '@/lib/apiClient'

// Regression: SubscriptionProvider calls User.me() on every page, including
// for signed-out visitors. The 401 ("No authentication token provided") was
// treated as an expired session: the client tried a refresh, failed, and
// redirected to /login — so /home, /terms and every other public page bounced
// anonymous visitors to the login screen.
const reject401 = (error) => (config) =>
  Promise.reject(Object.assign(new Error('401'), { config, response: { status: 401, data: { error } } }))

describe('apiClient 401 handling', () => {
  const originalAdapter = apiClient.defaults.adapter
  let hrefSetter

  beforeEach(() => {
    localStorage.clear()
    hrefSetter = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      pathname: '/home',
      set href(v) { hrefSetter(v) },
    })
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('does not refresh or redirect a signed-out visitor', async () => {
    const refresh = vi.spyOn(axios, 'post')
    apiClient.defaults.adapter = reject401('No authentication token provided')

    await expect(apiClient.get('/auth/me')).rejects.toBeTruthy()

    expect(refresh).not.toHaveBeenCalled()
    expect(hrefSetter).not.toHaveBeenCalled()
  })

  it('still ends a stored session whose token cannot be refreshed', async () => {
    localStorage.setItem('accessToken', 'expired')
    localStorage.setItem('refreshToken', 'revoked')
    vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 401, data: { error: 'Invalid refresh token' } } })
    apiClient.defaults.adapter = reject401('Invalid or expired token')

    await expect(apiClient.get('/auth/me')).rejects.toBeTruthy()

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(hrefSetter).toHaveBeenCalledWith('/login')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
