
import React, { useState, useEffect, useRef } from 'react';
import { File, Download, Reply, Trash2 } from 'lucide-react';
import { MessageReaction } from '@/api/entities';
import { toast } from 'sonner';
import StockMention from './StockMention';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const reactionEmojis = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💰', label: 'Money' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😂', label: 'Funny' },
];

const STOCK_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'ITC', 'SBIN', 
  'HINDUNILVR', 'KOTAKBANK', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN',
  'BAJFINANCE', 'WIPRO', 'ULTRACEMCO', 'NESTLEIND', 'TECHM', 'SUNPHARMA', 'ONGC',
  'TATASTEEL', 'HCLTECH', 'M&M', 'NTPC', 'POWERGRID', 'ADANIPORTS', 'COALINDIA',
  'TATAMOTORS', 'BAJAJFINSV', 'DRREDDY', 'INDUSINDBK', 'GRASIM', 'DIVISLAB'
];

const detectStockSymbols = (text) => {
  if (!text) return [];
  
  const symbols = new Set();
  
  const dollarMatches = text.match(/\$([A-Z&]+)/g);
  if (dollarMatches) {
    dollarMatches.forEach(match => {
      const symbol = match.substring(1);
      if (STOCK_SYMBOLS.includes(symbol)) {
        symbols.add(symbol);
      }
    });
  }
  
  const words = text.split(/\s+/);
  words.forEach(word => {
    const cleanWord = word.replace(/[^A-Z&]/g, '');
    if (STOCK_SYMBOLS.includes(cleanWord)) {
      symbols.add(cleanWord);
    }
  });
  
  return Array.from(symbols);
};

// Global cache for reactions to prevent redundant API calls
const reactionsCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export default function MessageContent({ message, user, onReply, isInPinnedSection = false }) {
  const [reactions, setReactions] = useState({});
  const [userReaction, setUserReaction] = useState(null);
  const [detectedStocks, setDetectedStocks] = useState([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const isMountedRef = useRef(true);
  const loadAttemptedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Only load reactions for non-bot, non-pinned-section messages, and only once
    if (message.id && 
        !message.id.startsWith('bot_') && 
        !isInPinnedSection && 
        !loadAttemptedRef.current) {
      
      loadAttemptedRef.current = true;
      
      // Add delay to prevent rate limiting
      const delay = Math.random() * 2000 + 1000; // 1-3 seconds random delay
      setTimeout(() => {
        if (isMountedRef.current) {
          loadReactions();
        }
      }, delay);
    }
    
    if (message.content && message.message_type === 'text') {
      const symbols = detectStockSymbols(message.content);
      setDetectedStocks(symbols);
    }
  }, [message.id, message.content, isInPinnedSection]);

  const loadReactions = async () => {
    if (isLoadingReactions || !isMountedRef.current) return;
    
    // Check cache first
    const cacheKey = `reactions_${message.id}`;
    const cached = reactionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setReactions(cached.reactions);
      setUserReaction(cached.userReaction);
      return;
    }

    setIsLoadingReactions(true);
    
    try {
      // Add exponential backoff retry
      let retries = 0;
      let allReactions = [];
      
      while (retries < 3) {
        try {
          allReactions = await MessageReaction.filter({ message_id: message.id });
          break; // Success, exit retry loop
        } catch (error) {
          if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
            retries++;
            if (retries < 3) {
              // Exponential backoff: 2s, 4s, 8s
              const waitTime = Math.pow(2, retries) * 1000;
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          throw error; // Non-rate-limit error or max retries reached
        }
      }
      
      if (!isMountedRef.current) return;
      
      const grouped = allReactions.reduce((acc, r) => {
        if (!acc[r.reaction]) {
          acc[r.reaction] = { count: 0, users: [] };
        }
        acc[r.reaction].count++;
        acc[r.reaction].users.push(r.user_id);
        return acc;
      }, {});
      
      setReactions(grouped);
      
      if (user) {
        const myReaction = allReactions.find(r => r.user_id === user.id);
        setUserReaction(myReaction?.reaction || null);
        
        // Cache the results
        reactionsCache.set(cacheKey, {
          reactions: grouped,
          userReaction: myReaction?.reaction || null,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Silently fail for reactions - not critical
      if (!error.message?.includes('Rate limit') && !error.message?.includes('429')) {
        console.warn('Could not load reactions:', error.message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingReactions(false);
      }
    }
  };

  const handleReaction = async (emoji) => {
    if (!user) {
      toast.error('Please log in to react');
      return;
    }

    if (isInPinnedSection) {
      toast.info('React to the original message in the chat');
      return;
    }

    try {
      if (userReaction === emoji) {
        const existingReactions = await MessageReaction.filter({ 
          message_id: message.id, 
          user_id: user.id 
        });
        
        if (existingReactions.length > 0) {
          await MessageReaction.delete(existingReactions[0].id);
        }
        setUserReaction(null);
      } else {
        if (userReaction) {
          const existingReactions = await MessageReaction.filter({ 
            message_id: message.id, 
            user_id: user.id 
          });
          
          if (existingReactions.length > 0) {
            await MessageReaction.delete(existingReactions[0].id);
          }
        }
        
        await MessageReaction.create({
          message_id: message.id,
          user_id: user.id,
          reaction: emoji
        });
        setUserReaction(emoji);
      }
      
      // Clear cache and reload with delay
      const cacheKey = `reactions_${message.id}`;
      reactionsCache.delete(cacheKey);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          loadReactions();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error handling reaction:', error);
      if (!error.message?.includes('Rate limit')) {
        toast.error('Failed to add reaction');
      }
    }
  };

  const renderMessageContent = () => {
    // Show deleted message placeholder
    if (message.is_deleted) {
      return (
        <div className="flex items-center gap-2 text-slate-400 italic text-sm py-2">
          <Trash2 className="w-4 h-4" />
          <span>This message was deleted</span>
        </div>
      );
    }

    switch (message.message_type) {
      case 'image':
        return (
          <motion.a 
            href={message.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <img
              src={message.file_url}
              alt={message.content || 'Uploaded image'}
              className="rounded-lg max-w-full h-auto mt-1 shadow-md hover:shadow-lg transition-shadow"
            />
          </motion.a>
        );
      case 'file':
        return (
          <motion.a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg mt-1 hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow-md"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <File className="w-5 h-5 text-slate-600 flex-shrink-0" />
            <span className="text-sm text-slate-800 truncate flex-1 font-medium">{message.file_name || 'Attached File'}</span>
            <Download className="w-4 h-4 text-slate-500" />
          </motion.a>
        );
      default:
        return (
          <>
            {/* Reply Thread Preview */}
            {message.reply_to_message_id && (
              <motion.div 
                className="bg-slate-100 border-l-4 border-blue-500 pl-3 py-2 mb-2 rounded-r text-xs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="font-semibold text-slate-700 flex items-center gap-1">
                  <Reply className="w-3 h-3" />
                  {message.reply_to_user_name}
                </p>
                <div 
                  className="text-slate-600"
                  style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'
                  }}
                >
                  {message.reply_to_content}
                </div>
              </motion.div>
            )}
            
            <div 
              className="text-sm leading-relaxed" 
              style={{ 
                wordBreak: 'break-word', 
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'
              }}
            >
              {message.content}
            </div>
            
            {/* Edited Indicator */}
            {message.is_edited && !message.is_deleted && (
              <p className="text-xs text-slate-400 mt-1 italic">
                (edited {formatDistanceToNow(new Date(message.edited_at), { addSuffix: true })})
              </p>
            )}
            
            {/* Stock Mention Cards with animation */}
            <AnimatePresence>
              {detectedStocks.length > 0 && !message.is_deleted && (
                <motion.div 
                  className="space-y-2 mt-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {detectedStocks.map(symbol => (
                    <StockMention key={symbol} symbol={symbol} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
    }
  };

  return (
    <div>
      {renderMessageContent()}
      
      {/* Reactions Display with smooth animations */}
      {!message.is_bot && message.id && !message.id.startsWith('bot_') && !isInPinnedSection && !message.is_deleted && Object.keys(reactions).length > 0 && (
        <motion.div 
          className="flex items-center gap-2 mt-2 flex-wrap"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {Object.entries(reactions).map(([emoji, data]) => (
            <motion.button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                userReaction === emoji
                  ? 'bg-blue-500 text-white shadow-md scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              disabled={isLoadingReactions}
            >
              <span className="text-base">{emoji}</span>
              <span className="font-semibold">{data.count}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
