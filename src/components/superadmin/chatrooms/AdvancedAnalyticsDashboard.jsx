import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MessageSquare, Users, UserPlus, PlusCircle, Loader2, AlertTriangle, Download } from 'lucide-react';
import chatAdminApi from './chatAdminApi';
import { apiError, downloadText, roomTypeLabel, toCsv } from './chatRoomUtils';

const RANGES = [7, 30, 90];
const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

/**
 * Chat analytics computed on the server over the whole database (the old
 * dashboard summed capped 200-row pages in the browser).
 */
export default function AdvancedAnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (span) => {
    setLoading(true);
    try {
      setData(await chatAdminApi.analytics(span));
      setError(null);
    } catch (e) {
      setError(apiError(e, 'Could not load analytics'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const exportDaily = () => {
    if (!data) return;
    downloadText(`chat-analytics-${data.days}d.csv`, toCsv(
      ['Date', 'Messages', 'Active posters', 'New participants'],
      data.daily.map((d) => [d.date, d.messages, d.active_users, d.joins]),
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <Button key={r} size="sm" variant={days === r ? 'default' : 'outline'} onClick={() => setDays(r)} aria-pressed={days === r}>
              Last {r} days
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />}
          <Button size="sm" variant="outline" onClick={exportDaily} disabled={!data}><Download className="w-4 h-4 mr-1" aria-hidden="true" />Export CSV</Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-sell/30 bg-sell-muted px-4 py-3 text-sm text-sell-muted-foreground" role="alert">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{error}</span>
          <Button size="sm" variant="outline" onClick={() => load(days)}>Retry</Button>
        </div>
      )}

      {!data && loading && <div className="py-16 text-center text-subtle" role="status">Loading analytics…</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Messages', data.totals.messages, MessageSquare],
              ['Active posters', data.totals.active_posters, Users],
              ['New participants', data.totals.new_participants, UserPlus],
              ['Rooms created', data.totals.rooms_created, PlusCircle],
            ].map(([label, value, Icon]) => (
              <Card key={label}><CardContent className="p-4 flex items-center gap-3">
                <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
                <div><p className="text-2xl font-bold">{Number(value).toLocaleString()}</p><p className="text-sm text-subtle">{label}</p></div>
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Daily activity</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={AXIS} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={AXIS} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="messages" name="Messages" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="active_users" name="Active posters" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="joins" name="New participants" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Busiest rooms</CardTitle></CardHeader>
              <CardContent>
                {data.top_rooms.length === 0 ? <p className="text-sm text-subtle text-center py-6">No messages in this period.</p> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.top_rooms} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={AXIS} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={AXIS} width={120} />
                        <Tooltip />
                        <Bar dataKey="messages" name="Messages" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Most active members</CardTitle></CardHeader>
              <CardContent>
                {data.top_posters.length === 0 ? <p className="text-sm text-subtle text-center py-6">No posters in this period.</p> : (
                  <ol className="space-y-2">
                    {data.top_posters.map((p, i) => (
                      <li key={p.user.id} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
                        <span className="text-sm"><span className="text-muted-foreground mr-2">{i + 1}.</span>{p.user.name}</span>
                        <Badge variant="outline">{p.messages} messages</Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Rooms by type</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.rooms_by_type.length === 0 ? <p className="text-sm text-subtle">No rooms yet.</p> : data.rooms_by_type.map((t) => (
                <Badge key={t.room_type} variant="outline" className="text-sm py-1">{roomTypeLabel(t.room_type)}: {t.count}</Badge>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
