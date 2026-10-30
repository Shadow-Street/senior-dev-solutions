import { vi } from 'vitest'

vi.mock('@/api/entities', () => ({ Meeting: {} }))
const { safeMeetingUrl } = await import('../MeetingControls')

// Meeting links are typed by any room member and opened in a new tab; only
// https URLs may be stored or opened.
describe('safeMeetingUrl', () => {
  it.each([
    'https://meet.google.com/abc-defg-hij',
    'https://zoom.us/j/123456789',
    '  https://teams.microsoft.com/l/meetup-join/x  ',
  ])('accepts %s', (url) => {
    expect(safeMeetingUrl(url)).toMatch(/^https:\/\//)
  })

  it.each([
    'javascript:alert(document.cookie)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://meet.google.com/plain-http',
    'meet.google.com/no-scheme',
    '',
    null,
  ])('rejects %s', (url) => {
    expect(safeMeetingUrl(url)).toBeNull()
  })
})
