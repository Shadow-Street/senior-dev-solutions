import React from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

/**
 * Real-time notification bell with live updates
 * Shows unread count and notification list
 */
export default function RealtimeNotificationBell({ userId, categories = [] }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useRealtimeNotifications(userId, {
    showToast: false, // Don't show toast, just update bell
    categories
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 animate-pulse text-primary" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-protocall-sell-text text-white text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className="p-3 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors border border-divider"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1 min-w-0">
                      {notif.title && (
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {notif.title}
                        </h4>
                      )}
                      <p className="text-sm text-subtle line-clamp-2 mt-1">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}