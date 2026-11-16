import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Radix Switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const api = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/lib/platformSettingsApi', () => ({
  platformSettingsApi: api,
  refreshPublicConfig: vi.fn(),
  settingsErrorMessage: (e, fallback) => e?.response?.data?.error || fallback,
  settingsFieldErrors: (e) => e?.response?.data?.fields || {},
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const { default: SettingsForm, checkField } = await import('../SettingsForm')

const managed = (overrides = {}) => ({
  definitions: [
    { key: 'site_name', type: 'string', label: 'Platform name', role: 'admin', min: 1, max: 80 },
    { key: 'support_email', type: 'email', label: 'Support email', role: 'admin' },
    { key: 'global_commission_rate', type: 'number', label: 'Default advisor commission (%)', role: 'admin', min: 0, max: 100 },
    { key: 'maintenance_mode', type: 'boolean', label: 'Maintenance mode', role: 'super_admin' },
  ],
  values: { site_name: 'Protocall', support_email: 'support@protocall.in', global_commission_rate: 20, maintenance_mode: false },
  can_edit_security: false,
  ...overrides,
})
const FIELDS = [
  { key: 'site_name', kind: 'text' },
  { key: 'support_email', kind: 'email' },
  { key: 'global_commission_rate', kind: 'number' },
  { key: 'maintenance_mode', kind: 'switch' },
]

describe('SettingsForm', () => {
  beforeEach(() => { api.save.mockReset(); toast.success.mockClear(); toast.error.mockClear() })

  it('loads current values; Save is disabled until something changes; reports dirty state', () => {
    const onDirtyChange = vi.fn()
    render(<SettingsForm fields={FIELDS} managed={managed()} onDirtyChange={onDirtyChange} />)
    expect(screen.getByLabelText('Platform name')).toHaveValue('Protocall')
    expect(screen.getByLabelText('Default advisor commission (%)')).toHaveValue(20)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Platform name'), { target: { value: 'Protocall India' } })
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  })

  it('sends only the changed keys and passes the saved values up', async () => {
    api.save.mockResolvedValue({ changed: ['site_name'], values: { site_name: 'Protocall India' } })
    const onSaved = vi.fn()
    render(<SettingsForm fields={FIELDS} managed={managed()} onSaved={onSaved} />)
    fireEvent.change(screen.getByLabelText('Platform name'), { target: { value: '  Protocall India ' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith({ site_name: 'Protocall India' }))
    expect(onSaved).toHaveBeenCalledWith({ site_name: 'Protocall India' })
    expect(toast.success).toHaveBeenCalled()
  })

  it('blocks obviously invalid input before calling the API', async () => {
    render(<SettingsForm fields={FIELDS} managed={managed()} />)
    fireEvent.change(screen.getByLabelText('Support email'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(api.save).not.toHaveBeenCalled()
  })

  it('shows the server field message when the API rejects a value', async () => {
    api.save.mockRejectedValue({ response: { status: 400, data: { error: 'Some settings are invalid', fields: { global_commission_rate: 'Default advisor commission (%) must have at most 2 decimal places' } } } })
    render(<SettingsForm fields={FIELDS} managed={managed()} />)
    fireEvent.change(screen.getByLabelText('Default advisor commission (%)'), { target: { value: '12.345' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/at most 2 decimal places/)).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Some settings are invalid')
  })

  it('security settings are read-only for admins and editable for super admins', () => {
    const { unmount } = render(<SettingsForm fields={FIELDS} managed={managed()} />)
    expect(screen.getByRole('switch', { name: 'Maintenance mode' })).toBeDisabled()
    expect(screen.getByText('Super admin only')).toBeInTheDocument()
    unmount()
    render(<SettingsForm fields={FIELDS} managed={managed({ can_edit_security: true })} />)
    expect(screen.getByRole('switch', { name: 'Maintenance mode' })).toBeEnabled()
  })

  it('after a save the parent passes the new values down and the form is clean again; Discard restores', async () => {
    api.save.mockResolvedValue({ changed: ['site_name'], values: { site_name: 'New name' } })
    const onDirtyChange = vi.fn()
    let current = managed()
    const { rerender } = render(<SettingsForm fields={FIELDS} managed={current} onDirtyChange={onDirtyChange}
      onSaved={(values) => { current = { ...current, values: { ...current.values, ...values } } }} />)
    fireEvent.change(screen.getByLabelText('Support email'), { target: { value: 'other@protocall.in' } })
    fireEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.getByLabelText('Support email')).toHaveValue('support@protocall.in')

    fireEvent.change(screen.getByLabelText('Platform name'), { target: { value: 'New name' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith({ site_name: 'New name' }))
    rerender(<SettingsForm fields={FIELDS} managed={current} onDirtyChange={onDirtyChange} onSaved={() => {}} />)
    expect(screen.getByLabelText('Platform name')).toHaveValue('New name')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('checkField mirrors the server rules', () => {
    expect(checkField({ type: 'string', min: 1 }, 'text', '')).toMatch(/required/)
    expect(checkField({ type: 'string' }, 'url', 'http://x.com')).toMatch(/https/)
    expect(checkField({ type: 'string' }, 'text', '<b>')).toMatch(/< or >/)
    expect(checkField({ type: 'integer', min: 0, max: 20 }, 'number', '1.5')).toMatch(/whole/)
    expect(checkField({ type: 'number', min: 0, max: 100 }, 'number', '101')).toMatch(/at most 100/)
    expect(checkField({ type: 'string' }, 'email', '')).toBeNull()
  })
})
