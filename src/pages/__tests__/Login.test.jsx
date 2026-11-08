import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import Login from '../Login'

const auth = { user: null, loading: false, login: vi.fn(), googleLogin: vi.fn() }
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => auth }))

// Stand-in for Google's button: clicking it yields a GIS credential (ID token).
vi.mock('@react-oauth/google', () => ({
  // A test double, not an app component: prop-types do not apply.
  // eslint-disable-next-line react/prop-types
  GoogleLogin: ({ onSuccess, onError }) => (
    <>
      <button type="button" onClick={() => onSuccess({ credential: 'google-id-token' })}>Continue with Google</button>
      <button type="button" onClick={() => onError()}>Google returned no credential</button>
    </>
  ),
}))

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/Dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  )

describe('Login', () => {
  beforeEach(() => {
    auth.googleLogin.mockReset()
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com')
  })
  afterEach(() => vi.unstubAllEnvs())

  test('offers Google and email sign-in, and no Facebook sign-in', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/facebook/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  test('sends the Google ID token (credential) and lands on the dashboard', async () => {
    auth.googleLogin.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    await waitFor(() => expect(screen.getByText('dashboard page')).toBeInTheDocument())
    expect(auth.googleLogin).toHaveBeenCalledWith('google-id-token')
  })

  test('shows the server message when Google sign-in is refused', async () => {
    auth.googleLogin.mockRejectedValue({
      response: { status: 403, data: { error: 'Your Google account email is not verified.' } },
    })
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your Google account email is not verified.')
  })

  test('Google returning no credential shows an inline error', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /google returned no credential/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/google sign-in did not complete/i)
    expect(auth.googleLogin).not.toHaveBeenCalled()
  })

  test('rate limiting and network failures get their own messages', async () => {
    auth.googleLogin.mockRejectedValueOnce({ response: { status: 429, data: {} } })
    const { unmount } = renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i)
    unmount()

    auth.googleLogin.mockRejectedValueOnce(new Error('Network Error'))
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
  })

  test('without a Google client id only email sign-in is offered', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    renderLogin()
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/or continue with email/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })
})
