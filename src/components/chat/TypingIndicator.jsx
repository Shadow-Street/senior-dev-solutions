import React, { useState, useEffect, useRef } from 'react';
import { TypingIndicator as TypingIndicatorEntity } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';

export default function TypingIndicator({ roomId, currentUserId }) {
  const [typingUsers, setTypingUsers] = useState([]);
  const pollIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    if (!roomId) return;

    // Load typing users initially with delay
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        loadTypingUsers();
      }
    }, 3000); // Increased to 3 seconds

    // Reduced polling frequency to every 10 seconds (was 5)
    pollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadTypingUsers();
      }
    }, 10000);

    return () => {
      isMountedRef.current = false;
      
      // Clear interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Clear initial timeout
      clearTimeout(initialTimeout);
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
        abortControllerRef.current = null;
      }
      
      // Clear state
      setTypingUsers([]);
    };
  }, [roomId, currentUserId]);

  const loadTypingUsers = async () => {
    if (!isMountedRef.current || !roomId) return;

    // Throttle requests - minimum 5 seconds between fetches (was 3)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 5000) {
      return;
    }
    lastFetchTimeRef.current = now;

    // Backoff if too many errors - wait 30 seconds after 3 errors
    if (consecutiveErrorsRef.current > 3) {
      if (now - lastFetchTimeRef.current < 30000) {
        return;
      }
      // Reset error count after backoff period
      consecutiveErrorsRef.current = 0;
    }

    // Abort previous request if still running
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const allTypingUsers = await TypingIndicatorEntity.filter({
        chat_room_id: roomId,
        is_typing: true
      }, '-last_typed_at', 5);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
        return;
      }

      const now = new Date();
      const activeUsers = allTypingUsers.filter(t => {
        if (t.user_id === currentUserId) return false;
        
        const lastTyped = new Date(t.last_typed_at);
        const secondsAgo = (now - lastTyped) / 1000;
        
        return secondsAgo < 10;
      });

      setTypingUsers(activeUsers);
      consecutiveErrorsRef.current = 0; // Reset error count on success

      // Cleanup stale indicators (non-blocking, with error handling)
      const staleUsers = allTypingUsers.filter(t => {
        const lastTyped = new Date(t.last_typed_at);
        const secondsAgo = (now - lastTyped) / 1000;
        return secondsAgo >= 10;
      });

      // Cleanup in batches with delay to avoid rate limiting
      if (staleUsers.length > 0 && isMountedRef.current) {
        setTimeout(() => {
          if (!isMountedRef.current) return;
          
          staleUsers.forEach((staleUser, index) => {
            setTimeout(() => {
              if (isMountedRef.current) {
                TypingIndicatorEntity.delete(staleUser.id).catch(() => {
                  // Silently ignore all deletion errors
                });
              }
            }, index * 1000); // 1 second delay between each delete (was 500ms)
          });
        }, 2000); // 2 second delay before cleanup (was 1 second)
      }
    } catch (error) {
      // Check if error is due to abort or component unmount
      if (!isMountedRef.current || 
          error.name === 'AbortError' || 
          error.message?.includes('aborted') || 
          error.message?.includes('canceled') ||
          error.message?.includes('Request aborted')) {
        // Silently ignore abort errors - this is expected behavior
        return;
      }

      // Handle rate limit errors
      if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
        consecutiveErrorsRef.current++;
        // Increase backoff time exponentially
        lastFetchTimeRef.current = Date.now() + (consecutiveErrorsRef.current * 10000); // 10s per error
        return;
      }

      // For other errors, increment error counter but don't break
      if (isMountedRef.current) {
        consecutiveErrorsRef.current++;
        // Silently handle - typing indicator is not critical
      }
    } finally {
      // Clean up abort controller
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  };

  if (typingUsers.length === 0) return null;

  const typingText = typingUsers.length === 1
    ? `${typingUsers[0].user_name} is typing`
    : typingUsers.length === 2
    ? `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing`
    : `${typingUsers[0].user_name} and ${typingUsers.length - 1} others are typing`;

  return (
    <div className="px-4 py-2 border-t bg-slate-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 text-sm text-slate-600"
        >
          <div className="flex gap-1">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 bg-blue-500 rounded-full"
            />
          </div>
          <span className="italic">{typingText}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}