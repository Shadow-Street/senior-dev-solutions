import { useContext } from 'react';
import { SubscriptionContext } from '../context/SubscriptionProvider';

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  // ✅ FIXED: Return null instead of throwing error if context not available
  // This allows the hook to work on public pages without SubscriptionProvider
  if (!context) {
    return null;
  }
  return context;
};