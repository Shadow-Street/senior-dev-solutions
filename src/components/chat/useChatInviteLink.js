import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

/**
 * Handles invite links made in Super Admin > Chat Room Management
 * (/ChatRooms?invite=CODE): redeems the code once, then calls
 * onJoined(roomId) and swaps the URL to ?roomId=<id> so the page opens the
 * room. The server decides everything (expiry, uses, bans, plan); this only
 * reports the outcome.
 */
export default function useChatInviteLink(onJoined) {
  const [params, setParams] = useSearchParams();
  const code = params.get('invite');
  const handled = useRef(null);

  useEffect(() => {
    if (!code || handled.current === code) return;
    handled.current = code;
    (async () => {
      try {
        const { data } = await apiClient.post(`/chatrooms/invites/${encodeURIComponent(code)}/redeem`);
        toast.success(data.already_member ? 'You are already in this room' : 'You joined the room');
        await onJoined?.(data.room_id);
        setParams({ roomId: data.room_id }, { replace: true });
      } catch (error) {
        const status = error?.response?.status;
        toast.error(status === 401
          ? 'Please sign in, then open the invite link again.'
          : error?.response?.data?.error || 'This invite link could not be used');
        const next = new URLSearchParams(window.location.search);
        next.delete('invite');
        setParams(next, { replace: true });
      }
    })();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
}
