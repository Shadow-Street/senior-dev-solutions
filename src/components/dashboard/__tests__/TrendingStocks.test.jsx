import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { Watchlist } from '@/lib/apiClient'
import TrendingStocks from '../TrendingStocks'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/stocks/MarketStatusBadge', () => ({ default: () => null }))

const stocks = [
  { symbol: 'TCS', name: 'Tata Consultancy', current_price: 3500, change_percent: 1.2, currency: 'INR' },
  { symbol: 'INFY', name: 'Infosys', current_price: 1500, change_percent: -0.4, currency: 'INR' },
]

function Where() {
  const loc = useLocation()
  return <p data-testid="where">{loc.pathname + loc.search}</p>
}

const renderCards = () =>
  render(
    <MemoryRouter initialEntries={['/Dashboard']}>
      <Routes>
        <Route path="/Dashboard" element={<TrendingStocks stocks={stocks} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )

// PPT slide 3: Watch and Chat only appeared on hover; they must show on every card.
describe('TrendingStocks', () => {
  beforeEach(() => localStorage.setItem('accessToken', 't'))
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

  it('every card shows Watch and Chat without hovering', async () => {
    vi.spyOn(Watchlist, 'filter').mockResolvedValue([{ stocks: [] }])
    renderCards()
    for (const s of stocks) {
      const watch = screen.getByRole('button', { name: `Add ${s.symbol} to watchlist` })
      expect(watch.parentElement.className).not.toMatch(/opacity-0/)
      expect(screen.getByRole('button', { name: `Open the ${s.symbol} chat room` })).toBeInTheDocument()
    }
  })

  it('Watch adds the stock to the watchlist and shows it as watched', async () => {
    vi.spyOn(Watchlist, 'filter').mockResolvedValue([{ stocks: ['INFY'] }])
    const create = vi.spyOn(Watchlist, 'create').mockResolvedValue({})
    renderCards()
    expect(await screen.findByRole('button', { name: 'INFY is on your watchlist' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Add TCS to watchlist' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith({ stock_symbol: 'TCS' }))
    expect(await screen.findByRole('button', { name: 'TCS is on your watchlist' })).toBeInTheDocument()
  })

  it('Chat opens that stock\'s room', () => {
    vi.spyOn(Watchlist, 'filter').mockResolvedValue([{ stocks: [] }])
    renderCards()
    fireEvent.click(screen.getByRole('button', { name: 'Open the TCS chat room' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/ChatRooms?stock_symbol=TCS')
  })
})
