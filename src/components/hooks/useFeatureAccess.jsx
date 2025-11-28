import { useSubscription } from './useSubscription';

/**
 * Hook to check if user has access to a specific feature
 * @param {string} featureKey - The feature key to check (e.g., 'premium_chat_rooms', 'pledge_pool')
 * @returns {object} - { hasAccess: boolean, userPlan: string, requiredPlan: string, isLoading: boolean }
 */
export const useFeatureAccess = (featureKey) => {
  const { subscription, planFeatures, isLoading, user } = useSubscription();

  // Admin and super_admin bypass all feature checks
  if (user && ['admin', 'super_admin'].includes(user.app_role)) {
    return {
      hasAccess: true,
      userPlan: user.app_role,
      requiredPlan: null,
      isLoading: false,
      isPremiumFeature: false
    };
  }

  // Guest users have no access to premium features
  if (!user) {
    return {
      hasAccess: false,
      userPlan: 'guest',
      requiredPlan: 'premium',
      isLoading: false,
      isPremiumFeature: true
    };
  }

  // Check if the feature exists in user's plan features
  const hasAccess = planFeatures?.includes(featureKey) || false;

  // Determine which plan includes this feature
  let requiredPlan = 'premium';
  if (!hasAccess) {
    // Check which tier this feature belongs to
    const basicFeatures = ['chat_rooms', 'community_polls', 'basic_stock_discussions', 'market_overview_access', 'basic_trading_tips', 'webinar_access'];
    const premiumFeatures = ['premium_chat_rooms', 'premium_polls', 'premium_events', 'advisor_picks', 'pledge_pool', 'advanced_analytics', 'priority_notifications'];
    const vipFeatures = ['advisor_subscriptions', 'exclusive_finfluencer_content', 'admin_recommendations', 'priority_support', 'exclusive_events', 'whatsapp_support_group', 'premium_research_reports', 'custom_alerts_notifications', 'one_on_one_trading_sessions', 'market_insider_insights', 'risk_management_tools'];

    if (basicFeatures.includes(featureKey)) {
      requiredPlan = 'basic';
    } else if (vipFeatures.includes(featureKey)) {
      requiredPlan = 'vip';
    } else {
      requiredPlan = 'premium';
    }
  }

  const isPremiumFeature = !['chat_rooms', 'community_polls', 'basic_stock_discussions', 'market_overview_access', 'basic_trading_tips', 'webinar_access'].includes(featureKey);

  return {
    hasAccess,
    userPlan: subscription?.plan_type || 'basic',
    requiredPlan,
    isLoading,
    isPremiumFeature
  };
};