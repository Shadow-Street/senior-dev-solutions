import { useContext, useCallback } from 'react';
import { EntityConfigContext } from '../context/EntityConfigProvider';

export function useEntityConfigs() {
  const context = useContext(EntityConfigContext);
  
  // Define all hooks first, before any conditional logic
  const configs = context?.configs || [];
  const isLoading = context?.isLoading || false;
  const error = context?.error || null;
  const refresh = context?.refresh || (() => {});

  const getEnabledConfigs = useCallback(() => {
    try {
      return Array.isArray(configs) ? configs.filter(c => c && c.enabled) : [];
    } catch (error) {
      console.error('Error filtering enabled configs:', error);
      return [];
    }
  }, [configs]);

  const getUserVisibleConfigs = useCallback(() => {
    try {
      return Array.isArray(configs) ? configs.filter(c => c && c.enabled && c.user_visible) : [];
    } catch (error) {
      console.error('Error filtering user visible configs:', error);
      return [];
    }
  }, [configs]);

  const getAdminVisibleConfigs = useCallback(() => {
    try {
      return Array.isArray(configs) ? configs.filter(c => c && c.enabled && c.admin_visible) : [];
    } catch (error) {
      console.error('Error filtering admin visible configs:', error);
      return [];
    }
  }, [configs]);

  const getConfigByEntityName = useCallback((entityName) => {
    try {
      return Array.isArray(configs) ? configs.find(c => c && c.entity_name === entityName) : undefined;
    } catch (error) {
      console.error('Error finding config by entity name:', error);
      return undefined;
    }
  }, [configs]);

  // Now check if context is undefined and warn
  if (context === undefined) {
    console.warn('useEntityConfigs used outside of EntityConfigProvider, returning defaults');
  }

  return {
    configs: Array.isArray(configs) ? configs : [],
    isLoading,
    error,
    refresh,
    getEnabledConfigs,
    getUserVisibleConfigs,
    getAdminVisibleConfigs,
    getConfigByEntityName,
  };
}