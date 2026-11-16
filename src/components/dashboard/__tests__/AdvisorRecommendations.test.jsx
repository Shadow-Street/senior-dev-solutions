import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AdvisorRecommendations from '../AdvisorRecommendations'

const access = { premium: false }
vi.mock('@/components/hooks/useSubscription', () => ({ useSubscription: () => ({ hasPremiumAccess: () => access.premium }) }))

const pick = { id: 'r1', stock_symbol: 'INFY', action: 'buy', target_price: '1890.00', stop_loss: '1700', timeframe: 'short_term', reason: 'Breakout above resistance', Advisor: { display_name: 'Arjun Rao' } }
const renderCard = (recs) => render(<MemoryRouter><AdvisorRecommendations recommendations={recs} /></MemoryRouter>)

// Seen on the PPT slide 3 screenshot: Advisor Picks was locked for every
// account, paying Premium/VIP members and the super admin included.
describe('AdvisorRecommendations', () => {
  it('premium, VIP and staff see real picks with their actual fields', () => {
    access.premium = true
    renderCard([pick])
    expect(screen.getByText('INFY')).toBeInTheDocument()
    expect(screen.getByText('Breakout above resistance')).toBeInTheDocument()
    expect(screen.getByText('₹1,890')).toBeInTheDocument()
    expect(screen.getByText('by Arjun Rao')).toBeInTheDocument()
    expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument()
  })

  it('an unlocked card with no picks says so instead of showing demo data', () => {
    access.premium = true
    renderCard([])
    expect(screen.getByText('No advisor picks yet')).toBeInTheDocument()
    expect(screen.queryByText('RELIANCE')).not.toBeInTheDocument()
  })

  it('free accounts get the lock', () => {
    access.premium = false
    renderCard([pick])
    expect(screen.getByText('Premium Feature')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Unlock Premium Access/ })).toHaveAttribute('href', '/Subscription')
  })
})
