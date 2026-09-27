import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Notification } from '@/api/entities';
import { toast } from 'sonner';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const allNotifications = await Notification.filter({ user_id: user.id }, '-created_date', 20);
      setNotifications(allNotifications);
      
      const unread = allNotifications.filter(n => n.status === 'unread').length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { status: 'read' });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      
      await Promise.all(
        unreadNotifications.map(n => Notification.update(n.id, { status: 'read' }))
      );
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'read' }))
      );
      
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      
      const deletedNotification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (deletedNotification?.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'info':
        return '📢';
      case 'warning':
        return '⚠️';
      case 'alert':
        return '🚨';
      default:
        return '📬';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-surface-2 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-subtle" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center bg-protocall-sell-text text-white text-xs px-1">
            {unreadCount}
          </Badge>
        )}
      </button>

      {showPanel && (
        <Card className="absolute right-0 mt-2 w-96 max-h-[600px] shadow-2xl border-0 z-50">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-protocall-blue" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-sell-muted text-sell-muted-foreground">{unreadCount} new</Badge>
                )}
              </CardTitle>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-surface-2 rounded transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-protocall-blue" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <>
                {unreadCount > 0 && (
                  <div className="p-3 border-b border-divider bg-surface-2">
                    <Button
                      onClick={handleMarkAllAsRead}
                      variant="ghost"
                      size="sm"
                      className="w-full text-protocall-blue hover:text-protocall-blue hover:bg-premium-muted"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark all as read
                    </Button>
                  </div>
                )}

                <div className="max-h-[450px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-divider hover:bg-surface-2 transition-colors ${
                        notification.status === 'unread' ? 'bg-premium-muted' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                        
                        <div className="flex-1 min-w-0">
                          {notification.title && (
                            <p className="font-semibold text-foreground text-sm mb-1">
                              {notification.title}
                            </p>
                          )}
                          <p className="text-sm text-subtle mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_date).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          {notification.status === 'unread' && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 hover:bg-border rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-buy-muted-foreground" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-1 hover:bg-border rounded transition-colors"
                            title="Delete"
                          >
                            <X className="w-4 h-4 text-sell-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}