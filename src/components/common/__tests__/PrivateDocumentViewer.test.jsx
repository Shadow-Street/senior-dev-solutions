import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/lib/privateFiles', () => ({ fetchPrivateFile: vi.fn() }))

import { fetchPrivateFile } from '@/lib/privateFiles'
import PrivateDocumentViewer from '../PrivateDocumentViewer'

const KEY = 'private/u1/sebi-certificates/cert.pdf'

describe('PrivateDocumentViewer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a PDF in the page (no new tab) and revokes the blob URL on close', async () => {
    const revoke = vi.fn()
    fetchPrivateFile.mockResolvedValue({ url: 'blob:cert', kind: 'pdf', filename: 'cert.pdf', revoke })
    window.open = vi.fn()
    const onClose = vi.fn()
    const { rerender } = render(<PrivateDocumentViewer fileKey={KEY} title="SEBI certificate: Armaan" onClose={onClose} />)
    const frame = await screen.findByTitle('SEBI certificate: Armaan')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe('blob:cert')
    expect(fetchPrivateFile).toHaveBeenCalledWith(KEY)
    expect(window.open).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /Download/ }).getAttribute('download')).toBe('cert.pdf')

    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape', code: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    rerender(<PrivateDocumentViewer fileKey={null} onClose={onClose} />)
    expect(revoke).toHaveBeenCalled()
  })

  it('images render as <img>; other files are download-only (never framed)', async () => {
    fetchPrivateFile.mockResolvedValueOnce({ url: 'blob:img', kind: 'image', filename: 'c.png', revoke: vi.fn() })
    const { unmount } = render(<PrivateDocumentViewer fileKey={KEY} title="Cert" onClose={() => {}} />)
    expect((await screen.findByAltText('Cert')).getAttribute('src')).toBe('blob:img')
    unmount()

    fetchPrivateFile.mockResolvedValueOnce({ url: 'blob:doc', kind: 'download', filename: 'c.docx', revoke: vi.fn() })
    render(<PrivateDocumentViewer fileKey={KEY} title="Doc" onClose={() => {}} />)
    expect(await screen.findByText(/cannot be previewed/)).toBeTruthy()
    expect(screen.queryByTitle('Doc')).toBeNull()
  })

  it('explains a missing file', async () => {
    fetchPrivateFile.mockRejectedValue({ response: { status: 404 } })
    render(<PrivateDocumentViewer fileKey={KEY} onClose={() => {}} />)
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be found/)
  })
})
