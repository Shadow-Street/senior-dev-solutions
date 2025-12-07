import { useCallback, useEffect, useRef, useState } from 'react';

const TYPING_DEBOUNCE = 1000; // Stop typing after 1 second of no input

export function useTypingIndicator(roomId, user, ws) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      ws?.startTyping?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      ws?.stopTyping?.();
    }, TYPING_DEBOUNCE);
  }, [isTyping, ws]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    ws?.stopTyping?.();
  }, [ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isTyping, startTyping, stopTyping };
}

export default useTypingIndicator;
