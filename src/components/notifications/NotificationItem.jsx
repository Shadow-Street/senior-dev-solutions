
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  UserCheck, 
  Mail,
  BookUser,
  Star,
  DollarSign,
  Users,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';

const getNotificationIcon = (category) => {
  switch (category) {
    case 'security':
      return AlertTriangle;
    case 'admin_pick':
      return Star;
    case 'pledge_update':
      return TrendingUp;
    case 'poll_result':
      return CheckCircle;
    case 'event_reminder':
      return Info;
    case 'new_message':
      return Mail;
    case 'achievement':
      return UserCheck;
    case 'advisor_post':
      return BookUser;
    case 'price_alert':
      return TrendingUp;
    case 'profit_alert':
      return DollarSign;
    case 'loss_alert':
      return TrendingDown;
    case 'consensus_alert':
      return Users;
    default:
      return Info;
  }
};

const getNotificationColor = (category, priority) => {
  if (priority === 'critical') return 'text-sell-muted-foreground bg-sell-muted';
  if (priority === 'important') return 'text-protocall-blue bg-premium-muted';
  
  switch (category) {
    case 'security':
      return 'text-sell-muted-foreground bg-sell-muted';
    case 'admin_pick':
      return 'text-protocall-premium-text bg-premium-muted';
    case 'advisor_post':
      return 'text-buy-muted-foreground bg-buy-muted';
    case 'price_alert':
      return 'text-protocall-blue bg-premium-muted';
    case 'profit_alert':
      return 'text-buy-muted-foreground bg-buy-muted';
    case 'loss_alert':
      return 'text-sell-muted-foreground bg-sell-muted';
    case 'consensus_alert':
      return 'text-protocall-premium-text bg-premium-muted';
    default:
      return 'text-subtle bg-surface-2';
  }
};

export default function NotificationItem({ notification, onMarkAsRead }) {
  const Icon = getNotificationIcon(notification.category);
  const colorClass = getNotificationColor(notification.category, notification.priority);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate if there's a link
    if (notification.link_url) {
      window.location.href = notification.link_url;
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
        notification.is_read 
          ? 'bg-white border-border' 
          : 'bg-premium-muted border-protocall-premium-light shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-sm font-medium truncate ${
              notification.is_read ? 'text-subtle' : 'text-foreground'
            }`}>
              {notification.title}
            </h4>
            
            {!notification.is_read && (
              <div className="w-2 h-2 bg-protocall-blue rounded-full flex-shrink-0" />
            )}
          </div>
          
          <p className={`text-xs mt-1 line-clamp-2 ${
            notification.is_read ? 'text-muted-foreground' : 'text-subtle'
          }`}>
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {format(new Date(notification.created_date), 'MMM d, h:mm a')}
            </p>
            
            <Badge 
              variant="outline" 
              className={`text-xs capitalize ${
                notification.priority === 'critical' ? 'border-sell/30 text-sell-muted-foreground' :
                notification.priority === 'important' ? 'border-protocall-premium-light text-protocall-blue' :
                'border-border text-subtle'
              }`}
            >
              {notification.category.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
