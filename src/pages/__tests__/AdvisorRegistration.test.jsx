import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const auth = { user: { id: 'u1', email: 'asha@example.test', app_role: 'user', role: 'user' }, refreshUser: vi.fn() }
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('@/lib/advisorApi', () => ({ advisorApi: { me: vi.fn(), apply: vi.fn() } }))
vi.mock('@/api/integrations', () => ({ UploadFile: vi.fn() }))

import { advisorApi } from '@/lib/advisorApi'
import { UploadFile } from '@/api/integrations'
import AdvisorRegistration from '../AdvisorRegistration'

const mount = () => render(<MemoryRouter><AdvisorRegistration /></MemoryRouter>)
const row = (extra = {}) => ({ id: 'a1', display_name: 'Asha Rao', sebi_registration_number: 'INA000012346', status: 'pending_approval', created_at: '2026-11-01T10:00:00Z', ...extra })

describe('AdvisorRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 'u1', email: 'asha@example.test', app_role: 'user', role: 'user' }
  })

  it('shows "under review" for a pending application, with no way to apply twice', async () => {
    advisorApi.me.mockResolvedValue({ advisor: row() })
    mount()
    expect(await screen.findByText('Application under review')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/go to my advisor dashboard/i)).not.toBeInTheDocument()
  })

  it('shows the rejection reason and lets the applicant correct and re-apply', async () => {
    advisorApi.me.mockResolvedValue({ advisor: row({ status: 'rejected', rejection_reason: 'Certificate unreadable', bio: 'Ten years of experience in options.' }) })
    mount()
    expect(await screen.findByText('Application not approved')).toBeInTheDocument()
    expect(screen.getByText('Certificate unreadable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /update details and apply again/i }))
    expect(screen.getByLabelText(/SEBI registration number/i)).toHaveValue('INA000012346')
    expect(screen.getByLabelText(/Full name/i)).toHaveValue('Asha Rao')
  })

  it('links an approved advisor to their dashboard', async () => {
    advisorApi.me.mockResolvedValue({ advisor: row({ status: 'approved' }) })
    mount()
    const link = await screen.findByRole('link', { name: /go to my advisor dashboard/i })
    expect(link.getAttribute('href')).toMatch(/AdvisorDashboard/i)
    expect(auth.refreshUser).toHaveBeenCalled()
  })

  it('refuses staff accounts', async () => {
    auth.user = { id: 'a1', email: 'admin@example.test', app_role: 'admin' }
    advisorApi.me.mockResolvedValue({ advisor: null })
    mount()
    expect(await screen.findByText(/staff accounts cannot apply/i)).toBeInTheDocument()
  })

  it('shows an error with retry when the status cannot be loaded', async () => {
    advisorApi.me.mockRejectedValueOnce({ response: { data: { error: 'boom' } } })
    mount()
    expect(await screen.findByText('boom')).toBeInTheDocument()
    advisorApi.me.mockResolvedValueOnce({ advisor: null })
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('button', { name: /submit application/i })).toBeInTheDocument()
  })

  describe('the form', () => {
    beforeEach(() => advisorApi.me.mockResolvedValue({ advisor: null }))
    const fill = (sebi = 'INA000012346') => {
      fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Asha Rao' } })
      fireEvent.change(screen.getByLabelText(/SEBI registration number/i), { target: { value: sebi } })
      fireEvent.change(screen.getByLabelText(/^Bio/i), { target: { value: 'Ten years of experience in options.' } })
      fireEvent.change(screen.getByLabelText(/SEBI certificate/i), { target: { files: [new File(['x'], 'cert.pdf', { type: 'application/pdf' })] } })
    }

    it('rejects a malformed SEBI number without calling the API', async () => {
      mount()
      await screen.findByRole('button', { name: /submit application/i })
      fill('313131')
      fireEvent.click(screen.getByRole('button', { name: /submit application/i }))
      expect(await screen.findByRole('alert')).toHaveTextContent(/must look like INA000012345/)
      expect(UploadFile).not.toHaveBeenCalled()
      expect(advisorApi.apply).not.toHaveBeenCalled()
    })

    it('uploads the certificate privately, submits without any status, and then shows the pending screen', async () => {
      UploadFile.mockResolvedValue({ file_url: 'http://x/api/files/view/private/u1/sebi-certificates/a.pdf', key: 'private/u1/sebi-certificates/a.pdf' })
      advisorApi.apply.mockResolvedValue({ advisor: row() })
      mount()
      await screen.findByRole('button', { name: /submit application/i })
      fill('ina000012346')
      fireEvent.click(screen.getByRole('button', { name: /options trading/i }))
      fireEvent.click(screen.getByRole('button', { name: /submit application/i }))

      expect(await screen.findByText('Application under review')).toBeInTheDocument()
      expect(UploadFile.mock.calls[0][0]).toMatchObject({ is_private: true, folder: 'sebi-certificates' })
      const payload = advisorApi.apply.mock.calls[0][0]
      expect(payload).toMatchObject({ display_name: 'Asha Rao', sebi_registration_number: 'INA000012346', specialization: ['Options Trading'] })
      expect(payload.sebi_document_key).toBe('private/u1/sebi-certificates/a.pdf')
      expect(payload).not.toHaveProperty('sebi_document_url')
      expect(payload).not.toHaveProperty('status')
      expect(payload).not.toHaveProperty('verified')
      expect(payload).not.toHaveProperty('user_id')
    })

    it('shows the server message when the application is refused', async () => {
      UploadFile.mockResolvedValue({ file_url: 'http://x/api/files/view/private/u1/sebi-certificates/a.pdf', key: 'private/u1/sebi-certificates/a.pdf' })
      advisorApi.apply.mockRejectedValue({ response: { status: 400, data: { error: 'Bio must be at least 10 characters' } } })
      mount()
      await screen.findByRole('button', { name: /submit application/i })
      fill()
      fireEvent.click(screen.getByRole('button', { name: /submit application/i }))
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Bio must be at least 10 characters'))
    })
  })
})
