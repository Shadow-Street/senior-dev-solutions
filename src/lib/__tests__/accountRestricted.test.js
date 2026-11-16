import { vi } from 'vitest'
import axios from 'axios'
import apiClient, { ACCOUNT_NOTICE_KEY } from '@/lib/apiClient'

// SEC-21: when an admin deactivates, suspends or blocks an account, the API
// answers 403 with a code. A signed-in browser must drop the session and tell
// the person why on the login page, instead of failing every request silently.
const reject = (status, data) => (config) =>
  Promise.reject(Object.assign(new Error(String(status)), { config, response: { status, data } }))

describe('apiClient restricted-account handling', () => {
  const originalAdapter = apiClient.defaults.adapter
  let hrefSetter

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    hrefSetter = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      pathname: '/Dashboard',
      set href(v) { hrefSetter(v) },
    })
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('ends the session and leaves the reason for the login page', async () => {
    localStorage.setItem('accessToken', 'a')
    localStorage.setItem('refreshToken', 'r')
    apiClient.defaults.adapter = reject(403, { code: 'ACCOUNT_SUSPENDED', error: 'This account is temporarily suspended.', until: '2026-12-01T10:00:00.000Z' })

    await expect(apiClient.get('/polls')).rejects.toBeTruthy()

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(hrefSetter).toHaveBeenCalledWith('/login')
    expect(sessionStorage.getItem(ACCOUNT_NOTICE_KEY)).toMatch(/temporarily suspended\. Access returns on/)
  })

  it('a refresh refused for a blocked account also explains why', async () => {
    localStorage.setItem('accessToken', 'expired')
    localStorage.setItem('refreshToken', 'r')
    vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 403, data: { code: 'ACCOUNT_BLOCKED', error: 'This account has been blocked.' } } })
    apiClient.defaults.adapter = reject(401, { error: 'Invalid or expired token' })

    await expect(apiClient.get('/polls')).rejects.toBeTruthy()

    expect(hrefSetter).toHaveBeenCalledWith('/login')
    expect(sessionStorage.getItem(ACCOUNT_NOTICE_KEY)).toBe('This account has been blocked.')
  })

  it('an ordinary 403 (no permission) keeps the session', async () => {
    localStorage.setItem('accessToken', 'a')
    apiClient.defaults.adapter = reject(403, { error: 'Admin access required' })

    await expect(apiClient.get('/admin/users')).rejects.toBeTruthy()

    expect(localStorage.getItem('accessToken')).toBe('a')
    expect(hrefSetter).not.toHaveBeenCalled()
  })
})

describe('apiClient maintenance handling', () => {
  const originalAdapter = apiClient.defaults.adapter
  afterEach(() => { apiClient.defaults.adapter = originalAdapter })

  it('a 503 MAINTENANCE answer tells the app shell at once and keeps the session', async () => {
    localStorage.setItem('accessToken', 'a')
    const seen = vi.fn()
    window.addEventListener('protocall:maintenance', seen)
    apiClient.defaults.adapter = (config) => Promise.reject(Object.assign(new Error('503'), { config, response: { status: 503, data: { code: 'MAINTENANCE', error: 'Back soon' } } }))

    await expect(apiClient.get('/polls')).rejects.toBeTruthy()

    expect(seen).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('accessToken')).toBe('a')
    window.removeEventListener('protocall:maintenance', seen)
  })
})
