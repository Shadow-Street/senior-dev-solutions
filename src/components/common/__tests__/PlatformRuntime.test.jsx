import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

const auth = vi.hoisted(() => ({ user: null, logout: vi.fn() }))
vi.mock('@/components/context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }))
const apiGet = vi.hoisted(() => vi.fn())
vi.mock('@/lib/apiClient', () => ({ default: { get: apiGet, put: vi.fn() } }))

const { default: PlatformRuntime } = await import('../PlatformRuntime')
const { default: ManagedStaticPage, splitParagraphs } = await import('../ManagedStaticPage')
const { __resetPublicConfig } = await import('@/lib/platformSettingsApi')

vi.mock('@/components/footer/PageFooter', () => ({ default: () => null }))

const renderAt = (path, ui) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

describe('PlatformRuntime', () => {
  beforeEach(() => {
    auth.user = null
    apiGet.mockReset()
    document.title = 'Protocall'
  })

  it('maintenance on: visitors and members see the maintenance screen with the message', async () => {
    __resetPublicConfig({ maintenance_mode: true, maintenance_message: 'Back at 6 pm', site_name: 'Protocall' })
    auth.user = { id: 'u', app_role: 'user' }
    renderAt('/Dashboard', <PlatformRuntime><p>app content</p></PlatformRuntime>)
    expect(screen.getByRole('heading', { name: /protocall is under maintenance/i })).toBeInTheDocument()
    expect(screen.getByText('Back at 6 pm')).toBeInTheDocument()
    expect(screen.queryByText('app content')).not.toBeInTheDocument()
  })

  it('maintenance on: staff bypass it, and the sign-in pages stay reachable', () => {
    __resetPublicConfig({ maintenance_mode: true })
    auth.user = { id: 'a', app_role: 'admin' }
    const { unmount } = renderAt('/SuperAdmin', <PlatformRuntime><p>admin content</p></PlatformRuntime>)
    expect(screen.getByText('admin content')).toBeInTheDocument()
    unmount()
    auth.user = null
    renderAt('/admin/login', <PlatformRuntime><p>sign in</p></PlatformRuntime>)
    expect(screen.getByText('sign in')).toBeInTheDocument()
  })

  it('writes the SEO title and description into the document head', async () => {
    __resetPublicConfig({ seo_meta_title: 'Protocall | Invest together', seo_meta_description: 'Community for retail investors' })
    renderAt('/', <PlatformRuntime><p>x</p></PlatformRuntime>)
    await waitFor(() => expect(document.title).toBe('Protocall | Invest together'))
    expect(document.head.querySelector('meta[name="description"]').getAttribute('content')).toBe('Community for retail investors')
  })

  it('keeps a title a page set for itself', async () => {
    __resetPublicConfig({ seo_meta_title: 'Default title' })
    document.title = 'Home | Protocall'
    renderAt('/', <PlatformRuntime><p>x</p></PlatformRuntime>)
    await waitFor(() => expect(document.title).toBe('Home | Protocall'))
  })
})

describe('ManagedStaticPage', () => {
  const Builtin = () => <p>built-in policy</p>

  it('shows the built-in page when nothing is published', async () => {
    apiGet.mockRejectedValue({ response: { status: 404 } })
    renderAt('/Privacy', <ManagedStaticPage slug="privacy" fallback={Builtin} />)
    expect(await screen.findByText('built-in policy')).toBeInTheDocument()
  })

  it('renders published text as plain text paragraphs, never as HTML', async () => {
    apiGet.mockResolvedValue({ data: { title: 'Privacy Policy', content: 'First para <img src=x onerror=alert(1)>\n\nSecond para', published_at: '2026-11-01T00:00:00Z' } })
    const { container } = renderAt('/Privacy', <ManagedStaticPage slug="privacy" fallback={Builtin} />)
    expect(await screen.findByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText(/First para/)).toBeInTheDocument()
    expect(screen.getByText('Second para')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(apiGet).toHaveBeenCalledWith('/static-pages/slug/privacy')
  })

  it('splitParagraphs splits on blank lines', () => {
    expect(splitParagraphs('a\n\n\nb\nc\n \n')).toEqual(['a', 'b\nc'])
  })
})
