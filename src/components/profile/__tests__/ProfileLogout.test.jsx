import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Regression: the Profile "Logout" button called User.logout() directly. That
// revoked the token but left the signed-in user in AuthContext and never
// redirected, so the user stayed on the Profile page. It must go through
// AuthContext's logout, which clears the session and navigates to /login.
const logout = vi.fn().mockResolvedValue(undefined)
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => ({ logout }) }))

const userLogout = vi.fn().mockResolvedValue(undefined)
vi.mock('@/api/entities', () => ({ User: { logout: userLogout, updateMyUserData: vi.fn() } }))
vi.mock('@/api/integrations', () => ({ UploadFile: vi.fn(), SendEmail: vi.fn() }))

const { default: ProfileGeneralSettings } = await import('../ProfileGeneralSettings')

describe('Profile logout', () => {
  beforeEach(() => {
    logout.mockClear()
    userLogout.mockClear()
  })

  it('logs out through AuthContext (which redirects to /login)', async () => {
    render(<ProfileGeneralSettings user={{ id: 'u1', display_name: 'Test', email: 't@example.com' }} onUserUpdate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /^logout$/i }))

    await vi.waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    // The bare entity call is what left the session alive in the UI.
    expect(userLogout).not.toHaveBeenCalled()
  })
})
