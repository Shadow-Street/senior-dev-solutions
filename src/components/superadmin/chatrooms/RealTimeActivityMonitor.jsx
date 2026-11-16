import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Users, MessageSquare, Radio, Pause, Play, AlertTriangle, Loader2 } from 'lucide-react';
import chatAdminApi from './chatAdminApi';
import { apiError, formatDateTime } from './chatRoomUtils';

const POLL_MS = 10000;

/**
 * Live view from the WebSocket server: who is connected, which rooms they are
 * in, and the last hour of messages. Refreshes every 10 s while this tab is
 * open and the page is visible.
 */
export default function RealTimeActivityMonitor() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      setData(await chatAdminApi.live());
      setError(null);
    } catch (e) {
      setError(apiError(e, 'Live activity is unavailable'));
    }
  }, []);

  useEffect(() => {
    load();
    if (paused) return undefined;
    timer.current = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') load();
    }, POLL_MS);
    return () => clearInterval(timer.current);
  }, [load, paused]);

  if (!data && !error) {
    return <div className="py-16 text-center text-subtle" role="status"><Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" aria-hidden="true" />Connecting to live activity…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-subtle">
          <span className={`w-2 h-2 rounded-full ${paused ? 'bg-muted-foreground' : 'bg-buy animate-pulse'}`} aria-hidden="true" />
          {paused ? 'Paused' : `Live · updated ${data ? formatDateTime(data.generated_at) : '—'}`}
        </div>
        <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
          {paused ? <><Play className="w-4 h-4 mr-1" aria-hidden="true" />Resume</> : <><Pause className="w-4 h-4 mr-1" aria-hidden="true" />Pause</>}
        </Button>
      </div>

      {error && <p className="text-sm text-sell-muted-foreground flex items-center gap-2" role="alert"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['Connected users', data.connected_users, Users],
              ['Rooms with people online', data.active_rooms.length, Radio],
              ['Messages in the last hour', data.messages_last_hour, MessageSquare],
            ].map(([label, value, Icon]) => (
              <Card key={label}><CardContent className="p-4 flex items-center gap-3">
                <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
                <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-subtle">{label}</p></div>
              </CardContent></Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" aria-hidden="true" />Rooms online now</CardTitle></CardHeader>
              <CardContent>
                {data.active_rooms.length === 0 ? <p className="text-sm text-subtle text-center py-6">Nobody is in a room right now.</p> : (
                  <ul className="space-y-3">
                    {data.active_rooms.map((r) => (
                      <li key={r.id} className="bg-surface-2 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{r.name}</span>
                          <Badge className="bg-buy-muted text-buy-muted-foreground">{r.online.length} online</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{r.online.map((u) => u.name).join(', ')}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" aria-hidden="true" />Latest messages (last hour)</CardTitle></CardHeader>
              <CardContent>
                {data.recent_messages.length === 0 ? <p className="text-sm text-subtle text-center py-6">No messages in the last hour.</p> : (
                  <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                    {data.recent_messages.map((m) => (
                      <li key={m.id} className="border-b pb-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-foreground">{m.author?.name}</span>
                          <Badge variant="outline" className="text-xs">{m.room_name}</Badge>
                          <span className="text-muted-foreground">{formatDateTime(m.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground break-words mt-1">{m.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
