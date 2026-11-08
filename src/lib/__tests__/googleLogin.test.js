import { vi } from 'vitest'
import apiClient, { authAPI } from '@/lib/apiClient'

// BE-20 regression: the client posted { accessToken } (an OAuth access token)
// while the server reads { token } (a Google ID token), so Google sign-in
// always failed. The body is now exactly { token }; no role is sent.
describe('authAPI.googleLogin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('posts exactly { token } and stores the session', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { accessToken: 'acc', refreshToken: 'ref', user: { id: 'u1', role: 'user' } },
    })

    const data = await authAPI.googleLogin('google-id-token')

    expect(post).toHaveBeenCalledWith('/auth/google', { token: 'google-id-token' })
    expect(data.user.id).toBe('u1')
    expect(localStorage.getItem('accessToken')).toBe('acc')
    expect(localStorage.getItem('refreshToken')).toBe('ref')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 'u1', role: 'user' })
  })

  it('stores nothing when the server refuses', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({ response: { status: 401, data: { error: 'Google sign-in failed.' } } })
    await expect(authAPI.googleLogin('bad')).rejects.toBeTruthy()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
