import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from '../ProtectedRoute'

const authState = { user: null, loading: false }
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => authState }))

function renderAt(path, allowedRoles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/unauthorized" element={<p>unauthorized page</p>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <p>secret page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.user = null
    authState.loading = false
  })

  it('shows a loading state while the session is resolving', () => {
    authState.loading = true
    renderAt('/admin')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByText('secret page')).not.toBeInTheDocument()
  })

  it('redirects signed-out visitors to /login', () => {
    renderAt('/admin')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('redirects users without an allowed role to /unauthorized', () => {
    authState.user = { id: 'u1', app_role: 'user', role: 'user' }
    renderAt('/admin', ['admin', 'super_admin'])
    expect(screen.getByText('unauthorized page')).toBeInTheDocument()
  })

  it('uses app_role before role, matching the backend', () => {
    authState.user = { id: 'u1', app_role: 'advisor', role: 'user' }
    renderAt('/admin', ['advisor'])
    expect(screen.getByText('secret page')).toBeInTheDocument()
  })

  it('renders children for an allowed role', () => {
    authState.user = { id: 'u1', app_role: 'admin' }
    renderAt('/admin', ['admin'])
    expect(screen.getByText('secret page')).toBeInTheDocument()
  })
})
