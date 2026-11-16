import { vi } from 'vitest'

vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn() } }))

import apiClient from '@/lib/apiClient'
import { fetchPrivateFile, privateKeyFrom } from '../privateFiles'

const KEY = 'private/11111111-1111-4111-8111-111111111111/sebi-certificates/0b6f2c1e-1111-4111-8111-111111111111-cert.pdf'
const bytes = (...b) => new Blob([new Uint8Array(b)])
const PDF = () => new Blob([new TextEncoder().encode('%PDF-1.7 rest')])

describe('fetchPrivateFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:cert')
    URL.revokeObjectURL = vi.fn()
    window.open = vi.fn()
  })

  it('requests only /files/view/<key> through the shared client and never opens a window', async () => {
    apiClient.get.mockResolvedValue({ data: PDF() })
    const file = await fetchPrivateFile(KEY)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get).toHaveBeenCalledWith(`/files/view/${KEY}`, { responseType: 'blob' })
    expect(window.open).not.toHaveBeenCalled()
    expect(file).toMatchObject({ url: 'blob:cert', kind: 'pdf', filename: 'cert.pdf' })
    expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/pdf')
    file.revoke()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cert')
  })

  it('decides the type from the bytes: images render, anything else is download-only', async () => {
    apiClient.get.mockResolvedValueOnce({ data: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d) })
    expect((await fetchPrivateFile(KEY)).kind).toBe('image')
    apiClient.get.mockResolvedValueOnce({ data: bytes(0xff, 0xd8, 0xff, 0xe0) })
    expect((await fetchPrivateFile(KEY)).kind).toBe('image')
    // An HTML or SVG file named .pdf must never render as a page.
    apiClient.get.mockResolvedValueOnce({ data: new Blob(['<svg onload=alert(1)>']) })
    const html = await fetchPrivateFile(KEY)
    expect(html.kind).toBe('download')
    expect(URL.createObjectURL.mock.calls[2][0].type).toBe('application/octet-stream')
  })

  it.each([
    'https://evil.example/api/files/view/' + KEY,
    '/api/auth/me',
    'public/avatars/a.png',
    'private/u1/sebi-certificates/../../etc/passwd',
    'private/u1/sebi-certificates/a.pdf?x=1',
    '',
    null,
    undefined,
  ])('refuses %s without sending any request', async (bad) => {
    await expect(fetchPrivateFile(bad)).rejects.toThrow()
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('propagates a failed request (no fallback to a raw URL)', async () => {
    apiClient.get.mockRejectedValue(new Error('network'))
    await expect(fetchPrivateFile(KEY)).rejects.toThrow('network')
    expect(window.open).not.toHaveBeenCalled()
  })
})

describe('privateKeyFrom', () => {
  it('accepts a key or a /files/view/<key> URL and returns only the key', () => {
    expect(privateKeyFrom(KEY)).toBe(KEY)
    expect(privateKeyFrom(`http://98.87.150.151/api/files/view/${KEY}`)).toBe(KEY)
    expect(privateKeyFrom(`/api/files/view/${KEY}`)).toBe(KEY)
  })

  it.each([
    `https://x.test/api/files/view/${KEY}?sig=1`,
    'https://x.test/api/files/view/public/a/b.png',
    'https://x.test/api/files/view/private/u1/f/..%2F..%2Fsecret',
    'https://x.test/other/path',
    'not a url at all %%%',
    '',
    null,
  ])('rejects %s', (bad) => {
    expect(privateKeyFrom(bad)).toBeNull()
  })
})
