import { vi } from 'vitest'
import { User, authAPI } from '@/lib/apiClient'
import { User as EntityUser } from '@/api/entities'

// Regression: both User.logout() helpers (lib/apiClient and api/entities)
// called authAPI.logout() without returning it, so `await User.logout()`
// resolved before the revoke call settled and before the stored tokens were
// cleared. Callers that redirect straight after logout
// (window.location.href = '/login') could unload the page mid-request and
// leave a live session in localStorage.
describe.each([
  ['lib/apiClient User', User],
  ['api/entities User', EntityUser],
])('%s.logout', (_name, UserApi) => {
  afterEach(() => vi.restoreAllMocks())

  it('waits for authAPI.logout to finish before resolving', async () => {
    let finished = false
    vi.spyOn(authAPI, 'logout').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => { finished = true; resolve() }, 20))
    )

    await UserApi.logout()

    expect(authAPI.logout).toHaveBeenCalledTimes(1)
    expect(finished).toBe(true)
  })
})
