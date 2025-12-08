import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, CheckCheck } from 'lucide-react';

export default function ReadReceiptIndicator({ 
  message, 
  currentUser, 
  readReceipts = [], 
  users = {},
  maxDisplay = 3 
}) {
  // Only show for current user's messages
  const isOwnMessage = message.created_by === currentUser?.email;
  
  if (!isOwnMessage || message.is_bot) return null;

  // Filter out current user from read receipts
  const readers = readReceipts
    .filter(r => r.user_id !== currentUser?.id && r.message_id === message.id)
    .map(r => users[r.user_id] || { id: r.user_id, display_name: 'Unknown' });

  const hasReaders = readers.length > 0;
  const displayReaders = readers.slice(0, maxDisplay);
  const remainingCount = readers.length - maxDisplay;

  if (!hasReaders) {
    // Message sent but not read by anyone
    return (
      <div className="flex items-center gap-1 mt-1">
        <Check className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] text-slate-400">Sent</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 mt-1 cursor-pointer">
            <CheckCheck className="w-3 h-3 text-blue-500" />
            <div className="flex -space-x-1.5">
              {displayReaders.map((reader, idx) => (
                <Avatar key={reader.id || idx} className="h-4 w-4 border border-white">
                  <AvatarFallback 
                    className="text-[8px] bg-slate-200 text-slate-600"
                    style={{ backgroundColor: reader.profile_color }}
                  >
                    {reader.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 && (
                <div className="h-4 w-4 rounded-full bg-slate-200 border border-white flex items-center justify-center">
                  <span className="text-[8px] text-slate-600">+{remainingCount}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-blue-500">
              Seen by {readers.length}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs">
            <p className="font-semibold mb-1">Seen by:</p>
            <ul className="space-y-0.5">
              {readers.map((reader, idx) => (
                <li key={reader.id || idx} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {reader.display_name || 'Unknown User'}
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
