import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const api = vi.hoisted(() => ({ status: vi.fn(), save: vi.fn(), renew: vi.fn(), test: vi.fn() }))
vi.mock('@/lib/marketDataAdminApi', () => ({
  marketDataAdminApi: api,
  marketDataErrorMessage: (e, fallback) => e?.response?.data?.error || fallback,
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const { default: ManageMarketData } = await import('../ManageMarketData')

const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.super-secret-payload.signature-value'
const base = {
  provider: 'dhan', encryption_available: true, configured: true, client_id_masked: '******3626', status: 'active', active: true,
  disabled_reason: null, expires_at: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), last_renewed_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  last_error: null, last_error_at: null, provider_active: true, universe_size: 2980, snapshot_at: new Date().toISOString(),
  snapshot_stale: false, market_open: true,
}

describe('Market Data (Dhan) panel', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    toast.success.mockClear()
    toast.error.mockClear()
  })

  it('shows the status and keeps the token field write-only (empty, password)', async () => {
    api.status.mockResolvedValue(base)
    render(<ManageMarketData />)
    expect(await screen.findByText('Active')).toBeInTheDocument()
    expect(screen.getByText('******3626')).toBeInTheDocument()
    expect(screen.getByText('2,980')).toBeInTheDocument()
    expect(screen.getByText(/serving live data/i)).toBeInTheDocument()
    const token = screen.getByLabelText(/access token/i)
    expect(token).toHaveAttribute('type', 'password')
    expect(token).toHaveValue('')
    expect(screen.getByRole('button', { name: /renew now/i })).toBeEnabled()
  })

  it('explains a lapse and how to recover, and disables renew/test', async () => {
    api.status.mockResolvedValue({ ...base, status: 'lapsed', active: false, provider_active: false, disabled_reason: 'lapsed', last_error: 'Renewal rejected by Dhan' })
    render(<ManageMarketData />)
    expect(await screen.findByText('Lapsed', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/web\.dhan\.co > My Profile > Access DhanHQ APIs/i)).toBeInTheDocument()
    expect(screen.getByText(/using fallback providers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /renew now/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled()
  })

  it('tells the admin when the server has no encryption key and blocks the form', async () => {
    api.status.mockResolvedValue({ ...base, encryption_available: false, configured: false, status: 'not_configured', active: false, disabled_reason: 'encryption_key_missing' })
    render(<ManageMarketData />)
    expect(await screen.findByText(/no encryption key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/access token/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /verify and save/i })).toBeDisabled()
  })

  it('saves a token, clears the field, and never displays the token', async () => {
    api.status.mockResolvedValue({ ...base, configured: false, status: 'not_configured', active: false, client_id_masked: null, provider_active: false })
    api.save.mockResolvedValue(base)
    render(<ManageMarketData />)
    await screen.findByText('Not configured')
    fireEvent.change(screen.getByLabelText(/dhan client id/i), { target: { value: '1100003626' } })
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: TOKEN } })
    fireEvent.click(screen.getByRole('button', { name: /verify and save/i }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith({ clientId: '1100003626', accessToken: TOKEN }))
    await waitFor(() => expect(screen.getByLabelText(/access token/i)).toHaveValue(''))
    expect(toast.success).toHaveBeenCalled()
    expect(document.body.textContent).not.toContain(TOKEN)
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })

  it('shows the server message when Dhan rejects the token, and validates input locally', async () => {
    api.status.mockResolvedValue({ ...base, configured: false, status: 'not_configured', active: false, client_id_masked: null })
    api.save.mockRejectedValue({ response: { data: { error: 'Dhan rejected this access token. It may be expired or mistyped.' } } })
    render(<ManageMarketData />)
    await screen.findByText('Not configured')
    fireEvent.change(screen.getByLabelText(/dhan client id/i), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText(/access token/i), { target: { value: TOKEN } })
    fireEvent.click(screen.getByRole('button', { name: /verify and save/i }))
    expect(await screen.findByText(/enter the numeric dhan client id/i)).toBeInTheDocument()
    expect(api.save).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/dhan client id/i), { target: { value: '1100003626' } })
    fireEvent.click(screen.getByRole('button', { name: /verify and save/i }))
    expect(await screen.findByText(/rejected this access token/i)).toBeInTheDocument()
  })

  it('renews now and tests the connection', async () => {
    api.status.mockResolvedValue(base)
    api.renew.mockResolvedValue({ ...base, last_renewed_at: new Date().toISOString() })
    api.test.mockResolvedValue({ ok: true, data_plan: 'Active', token_valid_until: base.expires_at, status: base })
    render(<ManageMarketData />)
    await screen.findByText('Active')
    fireEvent.click(screen.getByRole('button', { name: /renew now/i }))
    await waitFor(() => expect(api.renew).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('Token renewed.')
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }))
    expect(await screen.findByText(/dhan accepted the token/i)).toBeInTheDocument()
  })

  it('offers a retry when the status cannot be loaded', async () => {
    api.status.mockRejectedValueOnce({ response: { data: { error: 'Internal server error' } } }).mockResolvedValue(base)
    render(<ManageMarketData />)
    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })
})
