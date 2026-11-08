import apiClient from '@/lib/apiClient';

/**
 * Super Admin control of the DhanHQ market-data credential.
 * The access token is write-only: it is sent by `save` and never returned by
 * any endpoint (status only exposes a masked client id and timestamps).
 */
export const marketDataAdminApi = {
  status: () => apiClient.get('/admin/market-data/dhan').then((r) => r.data),
  save: ({ clientId, accessToken }) =>
    apiClient.put('/admin/market-data/dhan', { clientId, accessToken }).then((r) => r.data),
  renew: () => apiClient.post('/admin/market-data/dhan/renew').then((r) => r.data),
  test: () => apiClient.post('/admin/market-data/dhan/test').then((r) => r.data),
};

/** Best message from an API error, falling back to a generic one. Never includes request bodies. */
export function marketDataErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error || fallback;
}
