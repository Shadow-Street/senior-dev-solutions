import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Clock } from 'lucide-react';
import { useLiveActivity } from '../hooks/useLiveActivity';
import { formatDistanceToNow } from 'date-fns';

/**
 * Displays live activity indicator for a pledge session
 * Shows active users and recent activity
 */
export default function LiveActivityBadge({ sessionId, className = '' }) {
  const { activeUsers, recentPledges, lastActivity, isLoading } = useLiveActivity(sessionId);

  if (isLoading) {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        <Activity className="w-3 h-3 mr-1 animate-pulse" />
        Loading...
      </Badge>
    );
  }

  if (activeUsers === 0 && recentPledges === 0) {
    return null; // Don't show if no activity
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {activeUsers > 0 && (
        <Badge className="bg-buy-muted text-buy-muted-foreground border-buy/30 text-xs animate-pulse">
          <Users className="w-3 h-3 mr-1" />
          {activeUsers} {activeUsers === 1 ? 'user' : 'users'} active
        </Badge>
      )}
      
      {recentPledges > 0 && (
        <Badge variant="outline" className="text-xs border-protocall-premium-light text-protocall-blue">
          <Activity className="w-3 h-3 mr-1" />
          {recentPledges} {recentPledges === 1 ? 'pledge' : 'pledges'} (5min)
        </Badge>
      )}

      {lastActivity && (
        <Badge variant="outline" className="text-xs text-subtle">
          <Clock className="w-3 h-3 mr-1" />
          {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
        </Badge>
      )}
    </div>
  );
}