import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

/**
 * Managed platform settings (backend services/PlatformSettingsService.js).
 *
 * Two audiences:
 *   - the admin screen: definitions + values, validated batch save;
 *   - every page: the *public* config (site identity, SEO, support contact,
 *     referral rules, sign-up / maintenance state, sidebar configuration),
 *     fetched once, shared by every consumer, refreshed after an admin save.
 */

/** Typed defaults used until the public config arrives (and if it never does). */
export const PUBLIC_DEFAULTS = Object.freeze({
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
  seo_meta_title: 'Protocall - The Ultimate Social Trading Platform',
  seo_meta_description: '',
  seo_meta_keywords: 'social trading, stocks, finance, community, investing',
  support_email: 'support@protocall.in',
  support_phone: '+91-80-4567-8900',
  subscription_refund_enabled: true,
  referral_system_enabled: true,
  referral_inviter_bonus: 100,
  referral_conditions: '',
  registration_enabled: true,
  maintenance_mode: false,
  maintenance_message: '',
  session_idle_timeout_minutes: 0,
  nav_config_user: { items: [] },
  nav_config_admin: { items: [] },
});

let current = { ...PUBLIC_DEFAULTS };
let loaded = false;
let inflight = null;
let requestSeq = 0;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(current));

/** Fetches the public config (deduplicated). Never throws: failures keep the defaults. */
export function loadPublicConfig({ force = false } = {}) {
  if (loaded && !force) return Promise.resolve(current);
  if (inflight && !force) return inflight;
  // Only the newest request may update the config: a slow older response
  // must not overwrite a refresh that was asked for after an admin save.
  const seq = ++requestSeq;
  const request = apiClient
    .get('/platform/settings/public-config')
    .then((r) => {
      if (seq === requestSeq) {
        current = { ...PUBLIC_DEFAULTS, ...(r.data || {}) };
        loaded = true;
        emit();
      }
      return current;
    })
    .catch(() => current)
    .finally(() => { if (inflight === request) inflight = null; });
  inflight = request;
  return request;
}

/** Re-fetch after an admin save so the change shows without a reload. */
export function refreshPublicConfig() {
  return loadPublicConfig({ force: true });
}

export function getPublicConfigSnapshot() {
  return current;
}

/** Test hook. */
export function __resetPublicConfig(values = null) {
  current = { ...PUBLIC_DEFAULTS, ...(values || {}) };
  loaded = Boolean(values);
  inflight = null;
  emit();
}

/** The public platform config; re-renders when it changes. */
export function usePublicConfig() {
  const [config, setConfig] = useState(current);
  useEffect(() => {
    listeners.add(setConfig);
    setConfig(current);
    loadPublicConfig();
    return () => { listeners.delete(setConfig); };
  }, []);
  return config;
}

export const platformSettingsApi = {
  managed: () => apiClient.get('/platform/settings/managed').then((r) => r.data),
  save: (settings) => apiClient.put('/platform/settings/managed', { settings }).then((r) => r.data),
  integrations: () => apiClient.get('/platform/settings/integrations-status').then((r) => r.data),
  staticPages: () => apiClient.get('/static-pages/managed').then((r) => r.data),
  saveStaticPage: (slug, page) => apiClient.put(`/static-pages/managed/${encodeURIComponent(slug)}`, page).then((r) => r.data),
  publishedStaticPage: (slug) => apiClient.get(`/static-pages/slug/${encodeURIComponent(slug)}`).then((r) => r.data),
};

/** Best message from an API error; never includes request bodies. */
export function settingsErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error || fallback;
}

/** Per-field messages from a 400 response ({ fields: { key: message } }). */
export function settingsFieldErrors(error) {
  const fields = error?.response?.data?.fields;
  return fields && typeof fields === 'object' ? fields : {};
}
