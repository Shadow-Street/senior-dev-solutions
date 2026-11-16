import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'

globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const api = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/lib/platformSettingsApi', () => ({
  platformSettingsApi: api,
  refreshPublicConfig: vi.fn(),
  settingsErrorMessage: (e, fallback) => e?.response?.data?.error || fallback,
  settingsFieldErrors: (e) => e?.response?.data?.fields || {},
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { default: ManageEntityConfig } = await import('../ManageEntityConfig')

const base = { definitions: [], values: { nav_config_user: { items: [] }, nav_config_admin: { items: [] } }, can_edit_security: true }
const section = (name) => screen.getByRole('region', { name })

describe('Sidebar & Navigation', () => {
  beforeEach(() => { api.save.mockReset() })

  it('saves the member sidebar as a validated config (rename, hide, reorder)', async () => {
    api.save.mockImplementation(async (settings) => ({ changed: Object.keys(settings), values: settings }))
    render(<ManageEntityConfig managed={base} onSaved={() => {}} onDirtyChange={() => {}} />)
    const member = within(section('Member sidebar'))
    fireEvent.change(member.getByLabelText('Label for Advisors'), { target: { value: 'Experts' } })
    fireEvent.click(member.getByRole('switch', { name: 'Show Influencers' }))
    fireEvent.click(member.getByRole('button', { name: 'Move Subscription Plans up' }))
    fireEvent.click(member.getByRole('button', { name: /save sidebar/i }))
    await waitFor(() => expect(api.save).toHaveBeenCalled())
    const { items } = api.save.mock.calls[0][0].nav_config_user
    expect(items.find((i) => i.key === 'advisors')).toMatchObject({ label: 'Experts', visible: true })
    expect(items.find((i) => i.key === 'influencers').visible).toBe(false)
    expect(items.map((i) => i.key).slice(-2)).toEqual(['subscription', 'influencers'])
  })

  it('the Platform Settings and Dashboard tabs cannot be hidden', () => {
    render(<ManageEntityConfig managed={base} onSaved={() => {}} onDirtyChange={() => {}} />)
    const admin = within(section('Super Admin sidebar'))
    expect(admin.getByRole('switch', { name: 'Show Platform Settings' })).toBeDisabled()
    expect(admin.getByRole('switch', { name: 'Show Dashboard' })).toBeDisabled()
  })

  it('saving one sidebar keeps unsaved edits in the other', () => {
    const { rerender } = render(<ManageEntityConfig managed={base} onSaved={() => {}} onDirtyChange={() => {}} />)
    const admin = within(section('Super Admin sidebar'))
    fireEvent.change(admin.getByLabelText('Label for Financials'), { target: { value: 'Money' } })
    // The member list was saved: the parent passes down a new `managed`.
    const next = { ...base, values: { ...base.values, nav_config_user: { items: [{ key: 'advisors', visible: false, order: 0 }] } } }
    rerender(<ManageEntityConfig managed={next} onSaved={() => {}} onDirtyChange={() => {}} />)
    expect(within(section('Super Admin sidebar')).getByLabelText('Label for Financials')).toHaveValue('Money')
  })
})
