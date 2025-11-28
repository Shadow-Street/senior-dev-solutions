import { useState, useEffect } from 'react';
import { PlatformSetting, User } from '@/api/entities';

const defaultSettings = {
  commissionRate: 25,
  pledgeEnabled: true,
  advisorApprovalRequired: true,
  support_email: 'support@protocall.in',
  support_phone: '+91-80-4567-8900',
  site_name: 'Protocall',
  site_description: "India's largest retail investor community",
  contact_email: 'support@protocall.in',
  contact_phone: '+91-80-4567-8900',
  company_address: 'Bangalore, Karnataka - 560001, India',
  facebook_url: '',
  twitter_url: '',
  instagram_url: '',
  linkedin_url: '',
  youtube_url: '',
  social_link_twitter: '',
  social_link_linkedin: '',
  social_link_instagram: '',
  social_link_youtube: '',
  ad_cpc_rate: 5,
  ad_weekly_fee: 1000,
  ad_monthly_fee: 3500,
  subscription_refund_enabled: true,
};

// Global cache for platform settings (shared across all components)
let settingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 300000; // 5 minutes

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    let timeoutId = null;

    const loadSettings = async () => {
      try {
        // ✅ Check cache first
        const now = Date.now();
        if (settingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
          console.log('📦 Using cached platform settings');
          if (isMounted && !abortController.signal.aborted) {
            setSettings(settingsCache);
            setUsingDefaults(false);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);

        // ✅ Try to load settings without requiring user authentication
        // This allows public pages to display social media links
        let fetchedSettings = [];
        try {
          // Add small delay to prevent rapid API calls
          await new Promise(resolve => {
            timeoutId = setTimeout(resolve, 300);
          });
          
          if (!isMounted || abortController.signal.aborted) return;
          
          // Try to fetch settings (will work if settings table has public read access)
          fetchedSettings = await PlatformSetting.list().catch((error) => {
            // Silently handle errors - use defaults
            if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
              return [];
            }
            console.log('Could not load platform settings, using defaults');
            return [];
          });
        } catch (fetchError) {
          // Ignore abort errors
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            return;
          }
          // Use defaults for other errors
          fetchedSettings = [];
        }
        
        if (!isMounted || abortController.signal.aborted) return;
        
        if (fetchedSettings.length === 0) {
          if (isMounted && !abortController.signal.aborted) {
            setUsingDefaults(true);
            setSettings(defaultSettings);
            // Cache defaults too
            settingsCache = defaultSettings;
            cacheTimestamp = Date.now();
          }
        } else {
          const settingsMap = fetchedSettings.reduce((acc, setting) => {
            if (setting.setting_value === 'true') {
              acc[setting.setting_key] = true;
            } else if (setting.setting_value === 'false') {
              acc[setting.setting_key] = false;
            } else if (!isNaN(setting.setting_value) && setting.setting_value !== '') {
              acc[setting.setting_key] = Number(setting.setting_value);
            } else {
              acc[setting.setting_key] = setting.setting_value;
            }
            return acc;
          }, {});

          const mergedSettings = { ...defaultSettings, ...settingsMap };
          
          if (isMounted && !abortController.signal.aborted) {
            setSettings(mergedSettings);
            setUsingDefaults(false);
            
            // ✅ Update cache
            settingsCache = mergedSettings;
            cacheTimestamp = Date.now();
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          return;
        }
        // Handle other errors gracefully
        if (isMounted && !abortController.signal.aborted) {
          console.warn('Error loading platform settings:', error);
          setUsingDefaults(true);
          setSettings(defaultSettings);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      abortController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshKey]);

  const refreshSettings = () => {
    // Clear cache when manually refreshing
    settingsCache = null;
    cacheTimestamp = null;
    setRefreshKey(prev => prev + 1);
  };

  return {
    settings,
    isLoading,
    usingDefaults,
    refreshSettings
  };
};