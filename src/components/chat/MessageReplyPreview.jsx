import React from 'react';
import { Reply, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessageReplyPreview({ replyingTo, onCancel }) {
  if (!replyingTo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-2 rounded-r-lg flex items-start gap-3"
      >
        <Reply className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-800 mb-0.5">
            Replying to {replyingTo.user_name}
          </p>
          <p className="text-sm text-slate-700 line-clamp-2">
            {replyingTo.content}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          className="h-6 w-6 flex-shrink-0 hover:bg-blue-100"
        >
          <X className="w-4 h-4 text-slate-600" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}