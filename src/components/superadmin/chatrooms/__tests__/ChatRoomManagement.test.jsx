import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../chatAdminApi', () => ({
  default: { overview: vi.fn(), updateRoom: vi.fn(), deleteRoom: vi.fn() },
  chatAdminApi: {},
}));
vi.mock('../chatRoomUtils', async (orig) => ({ ...(await orig()), downloadText: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

import chatAdminApi from '../chatAdminApi';
import { downloadText } from '../chatRoomUtils';
import ChatRoomManagement from '../../ChatRoomManagement';

const overview = {
  rooms: [
    { id: 'r1', name: 'Reliance', room_type: 'stock_specific', stock_symbol: 'RELIANCE', required_plan: 'free', status: 'active', participant_count: 4, message_count: 12, online_count: 1, ban_count: 0 },
    { id: 'r2', name: 'VIP Lounge', room_type: 'premium', required_plan: 'vip', status: 'active', participant_count: 2, message_count: 3, online_count: 0, ban_count: 1, is_premium: true },
  ],
  stats: { total: 2, active_now: 1, premium: 1, participants: 6, messages: 15, active_today: 1 },
};

describe('ChatRoomManagement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the server stats and rooms, and exports only the filtered rooms', async () => {
    chatAdminApi.overview.mockResolvedValue(overview);
    render(<ChatRoomManagement />);

    expect(await screen.findByText('Reliance')).toBeInTheDocument();
    expect(screen.getByText('VIP Lounge')).toBeInTheDocument();
    expect(screen.getByText('Active Now').previousSibling.textContent).toBe('1');
    expect(screen.getByText('Messages', { selector: 'p' }).previousSibling.textContent).toBe('15');

    fireEvent.change(screen.getByLabelText('Search rooms'), { target: { value: 'vip' } });
    expect(screen.queryByText('Reliance')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    const csv = downloadText.mock.calls[0][1];
    expect(csv).toContain('VIP Lounge');
    expect(csv).not.toContain('Reliance');
  });

  it('shows an error with a retry when the overview fails', async () => {
    chatAdminApi.overview.mockRejectedValueOnce({ response: { data: { error: 'Admin access required' } } });
    render(<ChatRoomManagement />);
    expect(await screen.findByText('Admin access required')).toBeInTheDocument();
    chatAdminApi.overview.mockResolvedValue(overview);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getByText('Reliance')).toBeInTheDocument());
  });

  it('deleting a room needs its exact name', async () => {
    chatAdminApi.overview.mockResolvedValue(overview);
    chatAdminApi.deleteRoom.mockResolvedValue({ success: true });
    render(<ChatRoomManagement />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Reliance' }));
    const confirm = await screen.findByRole('button', { name: 'Delete room' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: 'Reliance' } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(chatAdminApi.deleteRoom).toHaveBeenCalledWith('r1', 'Reliance'));
  });
});
