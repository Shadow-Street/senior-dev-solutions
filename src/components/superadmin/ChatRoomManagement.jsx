import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  MessageSquare, Plus, BarChart3, Users as UsersIcon, Activity, Download, RefreshCw, Clock, Shield,
  Link2, Settings, Crown, AlertTriangle, Lock, Radio,
} from 'lucide-react';
import { toast } from 'sonner';

import chatAdminApi from './chatrooms/chatAdminApi';
import { apiError, downloadText, filterRooms, roomsToCsv } from './chatrooms/chatRoomUtils';
import ChatRoomTable from './chatrooms/ChatRoomTable';
import ChatRoomStats from './chatrooms/ChatRoomStats';
import ChatRoomFormModal from './chatrooms/ChatRoomFormModal';
import RealTimeActivityMonitor from './chatrooms/RealTimeActivityMonitor';
import BulkOperationsPanel from './chatrooms/BulkOperationsPanel';
import RoomAutomationPanel from './chatrooms/RoomAutomationPanel';
import ModerationRulesPanel from './chatrooms/ModerationRulesPanel';
import InviteSystemPanel from './chatrooms/InviteSystemPanel';
import PremiumRoomPanel from './chatrooms/PremiumRoomPanel';
import AccessControlPanel from './chatrooms/AccessControlPanel';
import PropTypes from 'prop-types';

const TABS = [
  { value: 'rooms', label: 'Rooms', icon: MessageSquare },
  { value: 'premium', label: 'Premium & VIP', icon: Crown },
  { value: 'access', label: 'Access', icon: Shield },
  { value: 'bulk', label: 'Bulk', icon: Settings },
  { value: 'activity', label: 'Live', icon: Activity },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'automation', label: 'Automation', icon: Clock },
  { value: 'moderation', label: 'Rules', icon: Lock },
  { value: 'invites', label: 'Invites', icon: Link2 },
];

const STAT_CARDS = [
  { key: 'total', label: 'Total Rooms', icon: MessageSquare, hint: 'All chat rooms' },
  { key: 'active_now', label: 'Active Now', icon: Radio, hint: 'Rooms with someone connected right now' },
  { key: 'premium', label: 'Premium Rooms', icon: Crown, hint: 'Rooms gated to Premium or VIP plans' },
  { key: 'participants', label: 'Participants', icon: UsersIcon, hint: 'Room memberships across all rooms' },
  { key: 'messages', label: 'Messages', icon: MessageSquare, hint: 'Messages stored across all rooms' },
  { key: 'active_today', label: 'Active Today', icon: BarChart3, hint: 'Rooms with at least one message today' },
];

const EMPTY_FILTERS = { search: '', type: 'all', plan: 'all', status: 'all' };

export default function ChatRoomManagement({ user = null }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await chatAdminApi.overview();
      if (!mounted.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setError(apiError(e, 'Could not load chat rooms'));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    if (mounted.current) setIsRefreshing(false);
  };

  const rooms = useMemo(() => data?.rooms || [], [data]);
  const filtered = useMemo(() => filterRooms(rooms, filters), [rooms, filters]);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error('No rooms match the current filters');
      return;
    }
    downloadText(`chat-rooms-${new Date().toISOString().slice(0, 10)}.csv`, roomsToCsv(filtered));
    toast.success(`Exported ${filtered.length} room${filtered.length === 1 ? '' : 's'}`);
  };

  const createRoom = async (payload) => {
    try {
      await chatAdminApi.createRoom(payload);
      toast.success('Chat room created');
      setShowCreate(false);
      await load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to create chat room'));
      throw e;
    }
  };

  if (!data && !error) {
    return (
      <div className="flex items-center justify-center p-16" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-lg text-subtle font-medium">Loading Chat Room Management...</p>
        </div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-sell" aria-hidden="true" />
          <p className="text-foreground font-medium">{error}</p>
          <Button onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = data.stats || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chat Room Management</h2>
          <p className="text-subtle">Manage rooms, participants, access and moderation</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={refresh} variant="outline" disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button onClick={exportCsv} variant="outline" title="Export the rooms matching the current filters">
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Create Room
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-sell/30 bg-sell-muted px-4 py-2 text-sm text-sell-muted-foreground" role="alert">
          {error} — showing the last loaded data.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, hint }) => (
          <Card key={key} className="bg-primary text-primary-foreground" title={hint}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className="w-7 h-7 shrink-0 opacity-90" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold">{Number(stats[key] || 0).toLocaleString()}</p>
                  <p className="text-sm opacity-90">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto justify-start bg-transparent rounded-lg p-1 gap-2">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="w-4 h-4 mr-1" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="rooms">
          <ChatRoomTable
            rooms={rooms}
            filteredRooms={filtered}
            filters={filters}
            onFiltersChange={setFilters}
            onChanged={load}
            adminUser={user}
          />
        </TabsContent>
        <TabsContent value="premium"><PremiumRoomPanel rooms={rooms} onChanged={load} /></TabsContent>
        <TabsContent value="access"><AccessControlPanel rooms={rooms} onChanged={load} /></TabsContent>
        <TabsContent value="bulk"><BulkOperationsPanel rooms={rooms} onChanged={load} /></TabsContent>
        <TabsContent value="activity"><RealTimeActivityMonitor /></TabsContent>
        <TabsContent value="analytics"><ChatRoomStats /></TabsContent>
        <TabsContent value="automation"><RoomAutomationPanel rooms={rooms} /></TabsContent>
        <TabsContent value="moderation"><ModerationRulesPanel rooms={rooms} /></TabsContent>
        <TabsContent value="invites"><InviteSystemPanel rooms={rooms} /></TabsContent>
      </Tabs>

      <ChatRoomFormModal open={showCreate} onClose={() => setShowCreate(false)} onSave={createRoom} />
    </div>
  );
}

ChatRoomManagement.propTypes = {
  user: PropTypes.object,
};
