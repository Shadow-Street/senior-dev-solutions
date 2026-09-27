import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import MessageContent from './MessageContent';

export default function PinnedMessagesSection({ messages = [], users = {}, onUnpin, currentUser, expanded = true, onToggleExpand }) {
  // Safety check - ensure messages is an array
  const pinnedMessages = Array.isArray(messages) 
    ? messages.filter(m => m && m.is_pinned) 
    : [];

  if (pinnedMessages.length === 0) return null;

  const getUserForMessage = (message) => {
    if (!message) return { display_name: 'Unknown', profile_color: 'hsl(var(--chart-4))' };
    
    if (message.is_bot) {
      return { display_name: 'AI Assistant', profile_color: 'hsl(var(--chart-4))', isBot: true };
    }
    return users[message.created_by] || { display_name: 'Unknown', profile_color: 'hsl(var(--chart-4))' };
  };

  const canUnpin = currentUser && (
    currentUser.app_role === 'admin' || 
    currentUser.app_role === 'super_admin'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4"
    >
      <Card className="bg-gradient-to-r from-surface-2 to-hold-muted border-2 border-hold/30 shadow-md">
        {/* Header */}
        <div 
          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-hold-muted/50 transition-colors"
          onClick={onToggleExpand}
        >
          <Pin className="w-5 h-5 text-hold-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-hold-muted-foreground text-sm">
              Pinned Messages
            </h4>
            <p className="text-xs text-hold-muted-foreground">
              {pinnedMessages.length} message{pinnedMessages.length !== 1 ? 's' : ''} pinned
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-hold-muted"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-hold-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-hold-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Pinned Messages List */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-hold/30 overflow-hidden"
            >
              <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                {pinnedMessages.map((msg) => {
                  if (!msg || !msg.id) return null; // Safety check
                  
                  const msgUser = getUserForMessage(msg);
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-lg p-3 border border-hold/30 shadow-sm hover:shadow-md transition-shadow relative group"
                    >
                      {/* Unpin Button */}
                      {canUnpin && onUnpin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnpin(msg.id);
                          }}
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sell-muted hover:text-sell-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Message Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: msgUser.profile_color }}
                        >
                          {msgUser.display_name?.charAt(0) || 'U'}
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                          {msgUser.display_name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          <Pin className="w-3 h-3 mr-1" />
                          Pinned
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {msg.created_date && formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="text-sm text-subtle line-clamp-3">
                        {msg.content ? (
                          <MessageContent
                            message={msg}
                            user={currentUser}
                            onReply={() => {}}
                            isInPinnedSection={true}
                          />
                        ) : (
                          <span className="text-muted-foreground italic">No content</span>
                        )}
                      </div>

                      {/* Pinned By Info */}
                      {msg.pinned_at && (
                        <div className="mt-2 pt-2 border-t border-hold/30">
                          <p className="text-xs text-hold-muted-foreground">
                            Pinned {formatDistanceToNow(new Date(msg.pinned_at), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}