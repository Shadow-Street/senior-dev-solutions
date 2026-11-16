import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

/*
 * Display names for subscription plan features.
 *
 * Plans store feature *keys* (e.g. "vipexclusive_chatrooms"); the name an
 * admin typed ("VIP Exclusive Chat Rooms") lives in the features catalogue
 * (GET /features, public). Title-casing the key produced "Vipexclusive
 * Chatrooms" on the plans page. The catalogue is fetched once per page load
 * and shared by every plan card.
 */

// Used before the catalogue loads, and for keys an admin never configured.
const FALLBACK_NAMES = {
  premium_chat_rooms: 'Premium Chat Rooms',
  premium_polls: 'Premium Polls',
  premium_events: 'Premium Events',
  advisor_subscriptions: 'Advisor Subscriptions',
  exclusive_finfluencer_content: 'Exclusive Finfluencer Content',
  admin_recommendations: 'Admin Recommendations',
  chat_rooms: 'Chat Rooms',
  community_polls: 'Community Polls',
  pledge_pool: 'Pledge Pool Access',
  advisor_picks: 'Advisor Picks',
  priority_support: 'Priority Support',
  exclusive_events: 'Exclusive Events',
};

let catalogue = null; // Promise<Record<string, string>>

function loadCatalogue() {
  if (!catalogue) {
    catalogue = apiClient
      .get('/features')
      .then(({ data }) => {
        const names = {};
        for (const f of Array.isArray(data) ? data : []) {
          if (f && typeof f.feature_key === 'string' && typeof f.feature_name === 'string' && f.feature_name.trim()) {
            names[f.feature_key] = f.feature_name.trim();
          }
        }
        return names;
      })
      .catch(() => {
        catalogue = null; // retry on the next mount
        return {};
      });
  }
  return catalogue;
}

/** Label for a feature key: catalogue name, then known label, then Title Case. */
export function featureLabel(feature, names = {}) {
  if (typeof feature !== 'string' || !feature.trim()) return 'Feature';
  if (names[feature]) return names[feature];
  if (FALLBACK_NAMES[feature]) return FALLBACK_NAMES[feature];
  if (feature.includes(' ')) return feature;
  return feature
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** { key: name } from the features catalogue; {} until it has loaded. */
export function useFeatureNames() {
  const [names, setNames] = useState({});
  useEffect(() => {
    let alive = true;
    loadCatalogue().then((n) => { if (alive) setNames(n); });
    return () => { alive = false; };
  }, []);
  return names;
}

/** Test hook: forget the cached catalogue. */
export const _resetFeatureNames = () => { catalogue = null; };
