import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import HomeExperts from '../HomeExperts'
import ProtoGuide from '../ProtoGuide'
import { HOME_PROTO_GREETING, HOME_PROTO_QA } from '../homeContent'

const responses = {}
vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn((url) => {
      const r = responses[url]
      return r instanceof Error ? Promise.reject(r) : Promise.resolve({ data: r })
    }),
  },
}))

const renderExperts = () =>
  render(
    <MemoryRouter>
      <HomeExperts />
    </MemoryRouter>
  )

describe('HomeExperts', () => {
  beforeEach(() => {
    responses['/advisors'] = [
      { id: 'a1', display_name: 'Arjun Rao', status: 'approved', specialization: '["Options Trading","Derivatives"]', follower_count: 156, success_rate: 75.8, sebi_registration_number: 'INH1', review_count: 0 },
      { id: 'a2', display_name: 'Anjali Mehta', status: 'approved', specialization: 'Equity, Swing', follower_count: 90 },
      { id: 'a3', display_name: 'Pending Person', status: 'pending', follower_count: 999 },
    ]
    responses['/finfluencers/top'] = [
      { id: 'f1', name: 'Pranjal Kamra', bio: 'Personal finance', specialization: ['Mutual Funds', 'SIP Planning'], follower_count: 145000 },
    ]
  })

  test('lists approved advisors only and shows the first one', async () => {
    renderExperts()
    expect(await screen.findByRole('heading', { name: 'Arjun Rao' })).toBeInTheDocument()
    expect(screen.getByText('Options Trading, Derivatives')).toBeInTheDocument()
    expect(screen.getByText('75.8%')).toBeInTheDocument()
    expect(screen.getByText('SEBI Regd.')).toBeInTheDocument()
    expect(screen.getByText('No ratings yet')).toBeInTheDocument()
    expect(screen.queryByText('Pending Person')).not.toBeInTheDocument()
  })

  test('selecting an avatar toggles aria-pressed and the detail card', async () => {
    renderExperts()
    const anjali = await screen.findByRole('button', { name: 'Anjali Mehta' })
    expect(anjali).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(anjali)
    expect(anjali).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Anjali Mehta' })).toBeInTheDocument()
    expect(screen.getByText('Equity, Swing')).toBeInTheDocument()
  })

  test('switching slides resets the selection and shows finfluencer tags', async () => {
    renderExperts()
    fireEvent.click(await screen.findByRole('button', { name: 'Anjali Mehta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(screen.getByRole('heading', { name: "Learn from Protocall's Finfluencers" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pranjal Kamra' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('SIP Planning')).toBeInTheDocument()
    expect(screen.getByText('1,45,000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Advisors' }))
    expect(screen.getByRole('button', { name: 'Arjun Rao' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('empty list and failed request read differently', async () => {
    responses['/advisors'] = []
    responses['/finfluencers/top'] = new Error('500')
    renderExperts()
    expect(await screen.findByText('No SEBI-registered advisors are listed yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Finfluencers' }))
    await waitFor(() => expect(screen.getByText(/couldn't load finfluencers/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Explore all finfluencers/ })).toHaveAttribute('href', '/Finfluencers')
  })
})

describe('ProtoGuide', () => {
  test('starts with the greeting and swaps in the chosen answer', () => {
    render(<ProtoGuide />)
    expect(screen.getByText(HOME_PROTO_GREETING)).toBeInTheDocument()
    const chip = screen.getByRole('button', { name: HOME_PROTO_QA[1].q })
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(HOME_PROTO_QA[1].a)).toBeInTheDocument()
    expect(screen.queryByText(HOME_PROTO_GREETING)).not.toBeInTheDocument()
  })
})
