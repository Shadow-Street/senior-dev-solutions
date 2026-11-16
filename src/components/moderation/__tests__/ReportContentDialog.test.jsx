import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const api = vi.hoisted(() => ({ report: vi.fn() }))
vi.mock('@/lib/moderationApi', () => ({
  moderationApi: api,
  moderationErrorMessage: (e, fallback) => e?.response?.data?.error || fallback,
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const { renderReportDialog } = await import('../ReportContentDialog')

describe('ReportContentDialog', () => {
  beforeEach(() => {
    api.report.mockReset()
    toast.success.mockClear()
    toast.error.mockClear()
  })

  it('needs a reason, then sends only target, reason and note', async () => {
    api.report.mockResolvedValue({ id: 'r1', status: 'pending', duplicate: false })
    const onClose = vi.fn()
    render(renderReportDialog({ type: 'message', id: 'm1' }, onClose))
    fireEvent.click(screen.getByRole('button', { name: /send report/i }))
    expect(await screen.findByText(/choose a reason/i)).toBeInTheDocument()
    expect(api.report).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/scam, fraud or phishing/i))
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: 'asks for my OTP' } })
    fireEvent.click(screen.getByRole('button', { name: /send report/i }))
    await waitFor(() => expect(api.report).toHaveBeenCalledWith({ targetType: 'message', targetId: 'm1', reason: 'scam', note: 'asks for my OTP' }))
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/moderators will review/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('"Something else" needs details; server errors are shown', async () => {
    api.report.mockRejectedValue({ response: { status: 429, data: { error: 'You have sent a lot of reports.' } } })
    render(renderReportDialog({ type: 'user', id: 'u1' }, () => {}))
    fireEvent.click(screen.getByLabelText(/something else/i))
    fireEvent.click(screen.getByRole('button', { name: /send report/i }))
    expect(await screen.findByText(/tell us briefly/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: 'impersonating an advisor' } })
    fireEvent.click(screen.getByRole('button', { name: /send report/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You have sent a lot of reports.'))
  })
})
