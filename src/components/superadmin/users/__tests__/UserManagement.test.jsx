import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'

const api = vi.hoisted(() => ({
  myAccess: vi.fn(), listUsers: vi.fn(), editUser: vi.fn(), setRole: vi.fn(), setTrustScore: vi.fn(), setStatus: vi.fn(),
  deleteUser: vi.fn(), assignableRoles: vi.fn(), matrix: vi.fn(), setRolePermission: vi.fn(), createRole: vi.fn(),
  updateRole: vi.fn(), deleteRole: vi.fn(), listTemplates: vi.fn(), createTemplate: vi.fn(), updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(), auditLog: vi.fn(),
}))
vi.mock('../adminUsersApi', async (orig) => ({ ...(await orig()), adminUsersApi: api }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

// Radix primitives need a few browser APIs jsdom lacks.
beforeAll(() => {
  globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} }
  Element.prototype.hasPointerCapture ||= () => false
  Element.prototype.releasePointerCapture ||= () => {}
  Element.prototype.scrollIntoView ||= () => {}
})

const { default: UserTableScreen } = await import('../UserTable')
const { default: RolesScreen } = await import('../RolesAndPermissions')
const { AdminAccessContext } = await import('../useAdminAccess')

// The screens read the caller's access from context (no-propTypes style).
const withAccess = (access, screenEl) => <AdminAccessContext.Provider value={access}>{screenEl}</AdminAccessContext.Provider>

const NONE = { edit: false, role: false, status: false, trust: false, delete: false }
const ALL = { edit: true, role: true, status: true, trust: true, delete: true }
const row = (over) => ({
  id: over.id, name: over.name, display_name: over.name, email: `${over.id}@example.test`, status: 'active',
  effective_role: 'user', role_label: 'User', trust_score: 50, created_at: '2026-01-01T00:00:00Z', actions: NONE, ...over,
})
const page = (data) => ({ data, total: data.length, page: 1, pages: 1, limit: 20, features: { trust_score: true, custom_roles: true } })

const openMenu = (name) => {
  const trigger = screen.getByRole('button', { name: `Actions for ${name}` })
  fireEvent.keyDown(trigger, { key: 'Enter' })
  return screen.findByRole('menu')
}

describe('User Management user list', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    Object.values(toast).forEach((f) => f.mockClear())
  })

  it('shows real statuses and an action menu built from what the server allows', async () => {
    api.listUsers.mockResolvedValue(page([
      row({ id: 'u1', name: 'Asha', actions: { ...ALL, delete: false } }),
      row({ id: 'u2', name: 'Bala', status: 'banned', actions: { ...NONE, status: true } }),
      row({ id: 'u3', name: 'Chitra', status: 'suspended', suspended_until: '2030-03-01T00:00:00Z' }),
      row({ id: 'me', name: 'Me', is_self: true }),
    ]))
    render(withAccess({ is_super_admin: false, role: 'admin' }, <UserTableScreen />))

    expect(await screen.findByText('Asha')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText(/^Suspended until/)).toBeInTheDocument()
    expect(screen.getByText('No actions')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()

    let menu = await openMenu('Asha')
    expect(within(menu).getByText('Edit user')).toBeInTheDocument()
    expect(within(menu).getByText('Change role')).toBeInTheDocument()
    expect(within(menu).getByText('Adjust trust score')).toBeInTheDocument()
    expect(within(menu).getByText('Deactivate user')).toBeInTheDocument()
    expect(within(menu).queryByText('Delete user')).not.toBeInTheDocument()
    fireEvent.keyDown(menu, { key: 'Escape' })

    menu = await openMenu('Bala')
    expect(within(menu).getByText('Reactivate user')).toBeInTheDocument()
    expect(within(menu).queryByText('Deactivate user')).not.toBeInTheDocument()
  })

  it('sends search and filters to the server, from page 1', async () => {
    api.listUsers.mockResolvedValue(page([]))
    render(withAccess({ role: 'admin' }, <UserTableScreen />))
    expect(await screen.findByText('No users found')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'asha' } })
    await waitFor(() => expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'asha', page: 1 })))
  })

  it('reactivates through the API and reloads the list', async () => {
    api.listUsers.mockResolvedValue(page([row({ id: 'u2', name: 'Bala', status: 'inactive', actions: { ...NONE, status: true } })]))
    api.setStatus.mockResolvedValue({ user: { id: 'u2', status: 'active' } })
    render(withAccess({ role: 'admin' }, <UserTableScreen />))
    await screen.findByText('Bala')
    const menu = await openMenu('Bala')
    fireEvent.click(within(menu).getByText('Reactivate user'))
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }))
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith('u2', { action: 'reactivate', reason: undefined }))
    expect(toast.success).toHaveBeenCalledWith('User reactivated')
    await waitFor(() => expect(api.listUsers).toHaveBeenCalledTimes(2))
  })

  it('delete needs the email typed before the button enables', async () => {
    api.listUsers.mockResolvedValue(page([row({ id: 'u1', name: 'Asha', actions: { ...NONE, delete: true } })]))
    api.deleteUser.mockResolvedValue({ anonymised: true })
    render(withAccess({ is_super_admin: true, role: 'super_admin' }, <UserTableScreen />))
    await screen.findByText('Asha')
    const menu = await openMenu('Asha')
    fireEvent.click(within(menu).getByText('Delete user'))
    const button = await screen.findByRole('button', { name: 'Delete user' })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/to confirm/), { target: { value: 'u1@example.test' } })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith('u1', 'u1@example.test'))
  })

  it('shows the server error when an action is refused', async () => {
    api.listUsers.mockResolvedValue(page([row({ id: 'u1', name: 'Asha', actions: { ...NONE, status: true } })]))
    api.setStatus.mockRejectedValue({ response: { data: { error: 'Only a super admin can apply this action to a staff account.' } } })
    render(withAccess({ role: 'admin' }, <UserTableScreen />))
    await screen.findByText('Asha')
    const menu = await openMenu('Asha')
    fireEvent.click(within(menu).getByText('Deactivate user'))
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Only a super admin can apply this action to a staff account.'))
  })

  it('shows an error state with retry when the list cannot load', async () => {
    api.listUsers.mockRejectedValueOnce({ response: { data: { error: 'You do not have permission to perform this action' } } })
    api.listUsers.mockResolvedValueOnce(page([row({ id: 'u1', name: 'Asha' })]))
    render(withAccess({ role: 'admin' }, <UserTableScreen />))
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission')
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Asha')).toBeInTheDocument()
  })
})

describe('Roles & Permissions matrix', () => {
  const matrix = {
    categories: [{ name: 'User Management', permissions: [{ key: 'users.view', label: 'View users', description: 'See accounts', section: 'users' }] }],
    roles: [
      { id: null, key: 'super_admin', name: 'Super Admin', kind: 'system', editable: false, all: true, permissions: ['users.view'], user_count: 1 },
      { id: 'r-cs', key: null, name: 'Customer Support', kind: 'custom', editable: true, deletable: true, all: false, permissions: [], user_count: 0 },
    ],
    admin_only_sections: [{ section: 'content', label: 'Content moderation' }],
    can_edit: true,
    custom_roles_available: true,
  }

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    Object.values(toast).forEach((f) => f.mockClear())
    api.matrix.mockResolvedValue(matrix)
    api.listTemplates.mockResolvedValue([])
    api.auditLog.mockResolvedValue({ data: [], total: 0, page: 1, pages: 1 })
  })

  it('groups permissions under real category names (never "undefined")', async () => {
    render(withAccess({ is_super_admin: true }, <RolesScreen />))
    expect(await screen.findByText('User Management')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'View users for Super Admin' })).toBeDisabled()
  })

  it('lists sections that cannot be granted as Admin only instead of offering dead toggles', async () => {
    render(withAccess({ is_super_admin: true }, <RolesScreen />))
    const list = await screen.findByRole('list', { name: 'Admin-only sections' })
    expect(within(list).getByText('Content moderation')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Content moderation/ })).not.toBeInTheDocument()
  })

  it('saves a toggle and rolls it back when the server refuses', async () => {
    api.setRolePermission.mockResolvedValueOnce({ role_id: 'r-cs', permissions: ['users.view'] })
    render(withAccess({ is_super_admin: true }, <RolesScreen />))
    const toggle = await screen.findByRole('switch', { name: 'View users for Customer Support' })
    fireEvent.click(toggle)
    await waitFor(() => expect(api.setRolePermission).toHaveBeenCalledWith('r-cs', 'users.view', true))
    await waitFor(() => expect(toggle).toHaveAttribute('data-state', 'checked'))

    api.setRolePermission.mockRejectedValueOnce({ response: { data: { error: 'Only a super admin can perform this action' } } })
    fireEvent.click(toggle)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Only a super admin can perform this action'))
    await waitFor(() => expect(toggle).toHaveAttribute('data-state', 'checked'))
  })
})
