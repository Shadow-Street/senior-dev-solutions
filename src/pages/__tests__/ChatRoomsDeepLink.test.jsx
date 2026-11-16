import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/api/entities', () => ({
  ChatRoom: {
    list: vi.fn().mockResolvedValue([
      { id: 'r-tcs', name: 'TCS Discussion', stock_symbol: 'TCS', room_type: 'stock_specific' },
      { id: 'r-gen', name: 'Market Talk', room_type: 'general' },
    ]),
  },
}))
vi.mock('../../components/chat/ChatInterface', () => ({ default: ({ room }) => <h1>Inside {room.name}</h1> }))
vi.mock('../../components/chat/ChatRoomCard', () => ({ default: ({ room }) => <p>Card {room.name}</p> }))
vi.mock('../../components/chat/CreateRoomModal', () => ({ default: () => null }))
vi.mock('../../components/chat/ShareRoomModal', () => ({ default: () => null }))

import ChatRooms from '../ChatRooms'
import { toast } from 'sonner'

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/ChatRooms" element={<ChatRooms />} /></Routes>
    </MemoryRouter>
  )

// Dashboard "Chat" (PPT slide 3), portfolio and poll links pass ?stock_symbol= /
// ?roomId=; the page ignored both and just showed the room list.
describe('ChatRooms deep links', () => {
  it('?stock_symbol= opens that stock\'s room', async () => {
    renderAt('/ChatRooms?stock_symbol=tcs')
    expect(await screen.findByText('Inside TCS Discussion')).toBeInTheDocument()
  })

  it('?roomId= opens that room', async () => {
    renderAt('/ChatRooms?roomId=r-gen')
    expect(await screen.findByText('Inside Market Talk')).toBeInTheDocument()
  })

  it('a stock without a room falls back to a filtered list with a note', async () => {
    renderAt('/ChatRooms?stock_symbol=WIPRO')
    expect(await screen.findByDisplayValue('WIPRO')).toBeInTheDocument()
    expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/no WIPRO room yet/))
  })
})

describe('ChatRooms deep links beyond the first page', () => {
  it('?roomId= for a room not in the list fetches it directly', async () => {
    const { ChatRoom } = await import('@/api/entities')
    ChatRoom.get = vi.fn().mockResolvedValue({ id: 'r-far', name: 'Far Room' })
    renderAt('/ChatRooms?roomId=r-far')
    expect(await screen.findByText('Inside Far Room')).toBeInTheDocument()
    expect(ChatRoom.get).toHaveBeenCalledWith('r-far')
  })

  it('?stock_symbol= for a room not in the list looks it up by symbol', async () => {
    const { ChatRoom } = await import('@/api/entities')
    ChatRoom.filter = vi.fn().mockResolvedValue([{ id: 'r-infy', name: 'INFY Room', stock_symbol: 'INFY' }])
    renderAt('/ChatRooms?stock_symbol=infy')
    expect(await screen.findByText('Inside INFY Room')).toBeInTheDocument()
  })
})
