import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '../useWebSocket';

// Admin actions in Chat Room Management reach open rooms over the socket;
// the hook must surface them (and stop reconnecting for restricted accounts).
let sockets;
class FakeSocket {
  constructor(url) { this.url = url; this.readyState = 1; this.sent = []; sockets.push(this); }
  send(m) { this.sent.push(JSON.parse(m)); }
  close() {}
}
FakeSocket.OPEN = 1;

describe('useWebSocket admin events', () => {
  beforeEach(() => { sockets = []; vi.stubGlobal('WebSocket', FakeSocket); vi.useFakeTimers(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  const setup = () => {
    const handlers = {
      onRemovedFromRoom: vi.fn(), onRoomUpdated: vi.fn(), onMuteChanged: vi.fn(), onAccountRestricted: vi.fn(),
    };
    renderHook(() => useWebSocket('room-1', { id: 'u1' }, handlers));
    const ws = sockets[0];
    act(() => ws.onopen());
    const emit = (data) => act(() => ws.onmessage({ data: JSON.stringify(data) }));
    return { handlers, ws, emit };
  };

  it('dispatches removal, room updates and mutes for this room only', () => {
    const { handlers, emit } = setup();
    emit({ type: 'removed_from_room', roomId: 'other' });
    emit({ type: 'removed_from_room', roomId: 'room-1' });
    emit({ type: 'room_updated', room: { id: 'room-1', locked: true } });
    emit({ type: 'muted_in_room', roomId: 'room-1' });
    emit({ type: 'unmuted_in_room', roomId: 'room-1' });
    expect(handlers.onRemovedFromRoom).toHaveBeenCalledTimes(1);
    expect(handlers.onRoomUpdated).toHaveBeenCalledWith({ id: 'room-1', locked: true });
    expect(handlers.onMuteChanged.mock.calls).toEqual([[true], [false]]);
  });

  it('does not reconnect after a 4003 (account restricted) close', () => {
    const { handlers, ws } = setup();
    act(() => ws.onclose({ code: 4003, reason: 'Account restricted' }));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(handlers.onAccountRestricted).toHaveBeenCalled();
    expect(sockets).toHaveLength(1);
  });
});
