import React, { createContext, useState, useEffect } from 'react';
import { EntityConfig } from '@/lib/apiClient';

export const EntityConfigContext = createContext({
  configs: [],
  isLoading: true,
  error: null,
  refreshConfigs: () => {},
});

export function EntityConfigProvider({ children }) {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfigs = async () => {
    let isMounted = true;
    let abortController = new AbortController();
    
    try {
      setError(null);
      
      // Add delay to avoid conflicts with dashboard loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!isMounted || abortController.signal.aborted) return;

      const allConfigs = await EntityConfig.list().catch((error) => {
        // Silently handle aborted requests - these are expected
        if (error?.message?.includes('aborted') || 
            error?.message?.includes('canceled') || 
            error?.name === 'AbortError' ||
            abortController.signal.aborted) {
          return [];
        }
        
        // Handle 404 gracefully - entity might not be set up yet
        if (error?.message?.includes('404') || error?.message?.includes('not found')) {
          console.info('[EntityConfigProvider] EntityConfig not found - using defaults');
          return [];
        }
        
        console.warn('[EntityConfigProvider] Could not load entity configs:', error.message);
        return [];
      });
      
      if (isMounted && !abortController.signal.aborted) {
        setConfigs(allConfigs);
      }
    } catch (err) {
      // Only set error for non-abort errors
      if (!err?.message?.includes('aborted') && 
          !err?.message?.includes('canceled') && 
          err?.name !== 'AbortError' &&
          !abortController.signal.aborted) {
        console.error('[EntityConfigProvider] Error loading configs:', err);
        setError(err.message);
      }
      
      if (isMounted && !abortController.signal.aborted) {
        setConfigs([]);
      }
    } finally {
      if (isMounted && !abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const refreshConfigs = () => {
    setIsLoading(true);
    loadConfigs();
  };

  return (
    <EntityConfigContext.Provider value={{ configs, isLoading, error, refreshConfigs }}>
      {children}
    </EntityConfigContext.Provider>
  );
}