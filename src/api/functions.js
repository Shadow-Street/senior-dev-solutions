import { marketAPI, authAPI } from '@/lib/apiClient';

// Use backend API for fetching stock price
export async function dhanGetStockPrice({ stockSymbol }) {
  try {
    const response = await marketAPI.getStockPrice(stockSymbol);
    return response.data;
  } catch (error) {
    console.error('API Error (dhanGetStockPrice):', error);
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Use backend API for Market Data
export async function dhanGetMarketData({ symbols = [] }) {
  try {
    const response = await marketAPI.getMarketData();
    return response.data;
  } catch (error) {
    console.error('API Error (dhanGetMarketData):', error);
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Use backend API for Stock Search
export async function dhanSearchStocks({ query }) {
  try {
    const response = await marketAPI.getStocks({ q: query });
    return {
      stocks: response.data,
      fallback: false
    };
  } catch (error) {
    console.error('API Error (dhanSearchStocks):', error);
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Use backend API for Yahoo Market Data (aliased to same backend logic for now)
export async function yahooGetMarketData({ symbols = [] }) {
  return dhanGetMarketData({ symbols });
}

// Use backend API for Auth (example replacement)
export async function exampleAuthFunction({ userId, password }) {
  try {
    const response = await authAPI.login(userId, password); // corrected signature
    return {
      success: true,
      token: response.accessToken,
      user: response.user
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// --- The following would ideally also move to backend endpoints ---
// For now, we will keep them as placeholders or simple logs until backend endpoints exist.

export async function sendAdvisorPostNotifications(data) {
  console.log('TODO: Implement sendAdvisorPostNotifications in backend', data);
  return { success: true, message: 'Notification scheduled (backend pending)' };
}

export async function trackRecommendationPerformance() {
  console.log('TODO: Implement trackRecommendationPerformance in backend');
  return { success: true, message: 'Tracking queued (backend pending)' };
}

export async function sendEventReminders(data) {
  console.log('TODO: Implement sendEventReminders in backend', data);
  return { success: true, message: 'Reminders queued (backend pending)' };
}

export async function sendFeedbackRequests(data) {
  console.log('TODO: Implement sendFeedbackRequests in backend', data);
  return { success: true, message: 'Feedback requests queued (backend pending)' };
}