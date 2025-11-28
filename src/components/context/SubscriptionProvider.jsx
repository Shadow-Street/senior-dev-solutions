import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, Subscription, SubscriptionPlan } from '@/api/entities';

export const SubscriptionContext = createContext(null);

// ✅ Cache to prevent duplicate API calls
let subscriptionCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 300000; // 5 minutes cache

// ✅ Global cache for subscription plans
let plansCache = null;
let plansCacheTimestamp = null;

// ✅ Prevent multiple simultaneous loads
let loadInProgress = false;

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [planFeatures, setPlanFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadSubscription = useCallback(async (abortController) => {
    // ✅ Prevent duplicate simultaneous loads
    if (loadInProgress) {
      console.log('⏳ Load already in progress, skipping...');
      return;
    }

    loadInProgress = true;

    try {
      setIsLoading(true);
      
      if (abortController?.signal?.aborted) {
        return;
      }

      // ✅ Check subscription cache first
      const now = Date.now();
      if (subscriptionCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Using cached subscription:', subscriptionCache.plan_type);
        setSubscription(subscriptionCache);
        setIsLoading(false);
        loadInProgress = false;
        return;
      }

      // ✅ Load user with better error handling
      const currentUser = await User.me({ signal: abortController?.signal }).catch((error) => {
        if (error?.name === 'AbortError' || 
            error?.message?.toLowerCase().includes('abort') ||
            error?.message?.toLowerCase().includes('cancel')) {
          console.log('🚫 User.me() aborted');
          return null;
        }
        console.log('ℹ️ User not authenticated');
        return null;
      });
      
      if (abortController?.signal?.aborted || !currentUser) {
        if (currentUser === null && !abortController?.signal?.aborted) {
          setUser(null);
          setSubscription(null);
          setSubscriptionPlan(null);
          setAllPlans([]);
          setPlanFeatures([]);
          setIsLoading(false);
        }
        loadInProgress = false;
        return;
      }
      
      setUser(currentUser);

      // ✅ Load plans with caching (only if not cached)
      let plans = [];
      if (plansCache && plansCacheTimestamp && (now - plansCacheTimestamp) < CACHE_DURATION) {
        console.log('📦 Using cached subscription plans');
        plans = plansCache;
      } else {
        try {
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay before plans call
          
          if (abortController?.signal?.aborted) {
            loadInProgress = false;
            return;
          }

          console.log('🔄 Fetching subscription plans...');
          plans = await SubscriptionPlan.list(null, null, null, { signal: abortController?.signal }).catch((err) => {
            if (err?.name === 'AbortError' || 
                err?.message?.toLowerCase().includes('abort') ||
                err?.message?.toLowerCase().includes('cancel')) {
              console.log('🚫 SubscriptionPlan.list() aborted');
              return [];
            }
            console.warn('⚠️ Failed to load subscription plans:', err.message);
            return [];
          });
          
          // Cache the plans
          if (plans.length > 0 && !abortController?.signal?.aborted) {
            plansCache = plans;
            plansCacheTimestamp = Date.now();
          }
        } catch (err) {
          if (!abortController?.signal?.aborted && 
              err?.name !== 'AbortError' && 
              !err?.message?.toLowerCase().includes('abort')) {
            console.warn('⚠️ Error loading plans:', err);
          }
          plans = [];
        }
      }
      
      if (abortController?.signal?.aborted) {
        loadInProgress = false;
        return;
      }
      
      setAllPlans(plans);

      // Admins and Super Admins bypass subscription checks
      if (['admin', 'super_admin'].includes(currentUser.app_role)) {
        console.log('🔓 Admin user detected - full access granted');
        setPlanFeatures(['*']); // Wildcard for all features
        setIsLoading(false);
        loadInProgress = false;
        return;
      }

      // ✅ Longer delay before subscription check
      await new Promise(resolve => setTimeout(resolve, 800));

      if (abortController?.signal?.aborted) {
        loadInProgress = false;
        return;
      }

      // Load user subscriptions with better error handling
      let userSubs = [];
      try {
        userSubs = await Subscription.filter(
          { user_id: currentUser.id, status: 'active' },
          '-created_date',
          1,
          null,
          { signal: abortController?.signal }
        ).catch((error) => {
          if (error?.name === 'AbortError' || 
              error?.message?.toLowerCase().includes('abort') ||
              error?.message?.toLowerCase().includes('cancel')) {
            console.log('🚫 Subscription.filter() aborted');
            return [];
          }
          console.warn('⚠️ Error fetching subscriptions:', error.message);
          return [];
        });
      } catch (error) {
        if (error?.name !== 'AbortError' && 
            !error?.message?.toLowerCase().includes('abort') &&
            !error?.message?.toLowerCase().includes('cancel')) {
          console.warn('⚠️ Error loading subscriptions:', error);
        }
        userSubs = [];
      }

      if (abortController?.signal?.aborted) {
        loadInProgress = false;
        return;
      }

      if (userSubs.length > 0) {
        const activeSub = userSubs[0];
        
        console.log('✅ Active Subscription Found:', {
          plan_type: activeSub.plan_type,
          status: activeSub.status,
          end_date: activeSub.end_date
        });
        
        setSubscription(activeSub);
        
        // ✅ Update cache
        subscriptionCache = activeSub;
        cacheTimestamp = Date.now();

        // ✅ Case-insensitive plan matching
        const planTypeLower = activeSub.plan_type?.toLowerCase();
        const plan = plans.find(p => {
          const planNameLower = p.name?.toLowerCase();
          const planNameNormalized = planNameLower?.replace(/\s+/g, '_');
          return planNameLower === planTypeLower || planNameNormalized === planTypeLower;
        });

        if (plan) {
          console.log('✅ Subscription Plan Matched:', plan.name);
          setSubscriptionPlan(plan);
          
          // ✅ Load plan features (including inherited)
          const allFeatures = await collectAllPlanFeatures(plan, plans);
          setPlanFeatures(allFeatures);
        } else {
          console.warn('⚠️ No matching plan found for:', activeSub.plan_type);
          setSubscriptionPlan(null);
          setPlanFeatures([]);
        }
      } else {
        console.log('ℹ️ No active subscription - using Free plan');
        
        // Get Free plan features
        const freePlan = plans.find(p => p.name?.toLowerCase() === 'free' || p.name?.toLowerCase() === 'basic');
        if (freePlan) {
          setSubscriptionPlan(freePlan);
          const allFeatures = await collectAllPlanFeatures(freePlan, plans);
          setPlanFeatures(allFeatures);
        } else {
          setSubscriptionPlan(null);
          setPlanFeatures([]);
        }
        
        setSubscription(null);
        subscriptionCache = null;
        cacheTimestamp = null;
      }
    } catch (error) {
      if (error?.name !== 'AbortError' && 
          !error?.message?.toLowerCase().includes('abort') && 
          !error?.message?.toLowerCase().includes('cancel') &&
          !abortController?.signal?.aborted) {
        console.error('❌ Error loading subscription:', error);
      }
      
      if (!abortController?.signal?.aborted) {
        setSubscription(null);
        setSubscriptionPlan(null);
        setAllPlans([]);
        setPlanFeatures([]);
        setUser(null);
      }
    } finally {
      if (!abortController?.signal?.aborted) {
        setIsLoading(false);
      }
      loadInProgress = false;
    }
  }, []);

  // ✅ Helper: Collect all features from plan hierarchy
  const collectAllPlanFeatures = async (plan, allPlans) => {
    const features = [...(plan.features || [])];

    // If plan inherits from another plan, get parent features too
    if (plan.inherits_from_plan_id) {
      try {
        const parentPlan = allPlans.find(p => p.id === plan.inherits_from_plan_id);
        
        if (parentPlan) {
          const parentFeatures = await collectAllPlanFeatures(parentPlan, allPlans);
          features.push(...parentFeatures);
        }
      } catch (error) {
        console.warn('Error loading parent plan features:', error);
      }
    }

    // Remove duplicates
    return [...new Set(features)];
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    // ✅ Longer initial delay to prevent race conditions
    const timeoutId = setTimeout(() => {
      if (isMounted && !abortController.signal.aborted) {
        loadSubscription(abortController);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      abortController.abort();
      loadInProgress = false; // Reset on cleanup
    };
  }, [loadSubscription]);

  // ✅ Check if user has access to a specific feature
  const hasFeatureAccess = useCallback((featureKey) => {
    // Admin/SuperAdmin bypass
    if (user && ['admin', 'super_admin'].includes(user.app_role)) {
      return true;
    }

    // Check if feature is in plan features
    return planFeatures?.includes(featureKey) || planFeatures?.includes('*');
  }, [planFeatures, user]);

  // ✅ Check if user has access to any of multiple features
  const hasAnyFeatureAccess = useCallback((featureKeys) => {
    return featureKeys.some(key => hasFeatureAccess(key));
  }, [hasFeatureAccess]);

  // ✅ Check if user has access to all of multiple features
  const hasAllFeatureAccess = useCallback((featureKeys) => {
    return featureKeys.every(key => hasFeatureAccess(key));
  }, [hasFeatureAccess]);

  const hasPremiumAccess = useCallback(() => {
    if (user && ['admin', 'super_admin'].includes(user.app_role)) {
      return true;
    }
    
    const planTypeLower = subscription?.plan_type?.toLowerCase();
    const isPremium = planTypeLower === 'premium' || planTypeLower === 'vip';
    
    return isPremium;
  }, [subscription, user]);

  const hasVipAccess = useCallback(() => {
    if (user && ['admin', 'super_admin'].includes(user.app_role)) {
      return true;
    }
    
    const planTypeLower = subscription?.plan_type?.toLowerCase();
    const isVip = planTypeLower === 'vip';
    
    return isVip;
  }, [subscription, user]);

  const hasAdvisorSubscription = useCallback((advisorId) => {
    if (user && ['admin', 'super_admin'].includes(user.app_role)) {
      return true;
    }
    return hasFeatureAccess('advisor_subscriptions');
  }, [hasFeatureAccess, user]);

  const checkAccess = useCallback((requiredFeature) => {
    return hasFeatureAccess(requiredFeature);
  }, [hasFeatureAccess]);

  const refreshSubscription = useCallback(() => {
    subscriptionCache = null;
    cacheTimestamp = null;
    plansCache = null;
    plansCacheTimestamp = null;
    loadInProgress = false;
    
    const abortController = new AbortController();
    loadSubscription(abortController);
    
    return () => abortController.abort();
  }, [loadSubscription]);

  const value = {
    subscription,
    subscriptionPlan,
    planFeatures,
    user,
    isLoading,
    hasFeatureAccess,
    hasAnyFeatureAccess,
    hasAllFeatureAccess,
    hasPremiumAccess,
    hasVipAccess,
    hasAdvisorSubscription,
    checkAccess,
    refreshSubscription,
    isSubscribed: !!subscription,
    isPremium: subscription?.plan_type === 'premium' || subscription?.plan_type === 'vip',
    isVIP: subscription?.plan_type === 'vip'
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}