import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('@/api/entities', () => ({
  User: { me: vi.fn() },
  Poll: { filter: vi.fn() },
  Subscription: { filter: vi.fn() },
}))
vi.mock('@/lib/advisorApi', () => ({ advisorApi: { stockSummary: vi.fn() } }))
vi.mock('../AlertModal', () => ({ default: () => null }))

import { User, Poll, Subscription } from '@/api/entities'
import { advisorApi } from '@/lib/advisorApi'
import StockCard from '../StockCard'

describe('StockCard advisor consensus', () => {
  it('reads the public per-stock tally instead of advisor posts', async () => {
    User.me.mockResolvedValue({ id: 'u1' })
    Subscription.filter.mockResolvedValue([{ plan_type: 'premium' }])
    Poll.filter.mockResolvedValue([])
    advisorApi.stockSummary.mockResolvedValue({ buy: 3, sell: 0, hold: 1, total: 4 })
    render(<MemoryRouter><StockCard stock={{ symbol: 'TCS', name: 'TCS', price: 1, change_percent: 1 }} /></MemoryRouter>)
    await waitFor(() => expect(advisorApi.stockSummary).toHaveBeenCalledWith('TCS'))
  })

  it('falls back to an empty tally when the endpoint fails', async () => {
    User.me.mockResolvedValue({ id: 'u1' })
    Subscription.filter.mockResolvedValue([{ plan_type: 'vip' }])
    Poll.filter.mockResolvedValue([])
    advisorApi.stockSummary.mockRejectedValue(new Error('x'))
    render(<MemoryRouter><StockCard stock={{ symbol: 'INFY', name: 'Infosys', price: 1, change_percent: -1 }} /></MemoryRouter>)
    await waitFor(() => expect(advisorApi.stockSummary).toHaveBeenCalledWith('INFY'))
    expect(screen.getByText(/INFY/)).toBeInTheDocument()
  })
})
