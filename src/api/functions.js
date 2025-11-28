    // import { base44 } from './base44Client';


    // export const dhanGetStockPrice = base44.functions.dhanGetStockPrice;

    // export const dhanGetMarketData = base44.functions.dhanGetMarketData;

    // export const dhanSearchStocks = base44.functions.dhanSearchStocks;

    // export const yahooGetMarketData = base44.functions.yahooGetMarketData;

    // export const exampleAuthFunction = base44.functions.exampleAuthFunction;

    // export const sendAdvisorPostNotifications = base44.functions.sendAdvisorPostNotifications;

    // export const trackRecommendationPerformance = base44.functions.trackRecommendationPerformance;

    // export const sendEventReminders = base44.functions.sendEventReminders;

    // export const sendFeedbackRequests = base44.functions.sendFeedbackRequests;



    // Mock implementations with sample data - no external dependencies

// Mock function for getting stock price
export async function dhanGetStockPrice({ stockSymbol }) {
  try {
    // Return sample data without API calls
    const sampleData = {
      symbol: stockSymbol || 'RELIANCE',
      exchange: 'NSE',
      current_price: 2456.75,
      change_amount: 56.25,
      change_percent: 2.34,
      day_high: 2478.50,
      day_low: 2432.10,
      previous_close: 2400.50,
      volume: 1234567,
      last_updated: new Date().toISOString(),
      source: 'demo'
    };
    return sampleData;
  } catch (error) {
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Mock function for Dhan market data
export async function dhanGetMarketData({ symbols = [] }) {
  try {
    // Sample market data
    const sampleStocks = [
      { symbol: 'RELIANCE', current_price: 2456.75, change_percent: 2.34, volume: 1234567 },
      { symbol: 'TCS', current_price: 3842.50, change_percent: -1.23, volume: 987654 },
      { symbol: 'HDFCBANK', current_price: 1654.30, change_percent: 0.87, volume: 2345678 },
      { symbol: 'INFY', current_price: 1567.25, change_percent: 1.45, volume: 1567890 },
      { symbol: 'ICICIBANK', current_price: 956.40, change_percent: -0.56, volume: 3456789 },
    ];
    const gainers = sampleStocks
      .filter(s => s.change_percent > 0)
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, 5);
    const losers = sampleStocks
      .filter(s => s.change_percent < 0)
      .sort((a, b) => a.change_percent - b.change_percent)
      .slice(0, 5);
    return {
      stocks: sampleStocks,
      gainers: gainers,
      losers: losers,
      timestamp: new Date().toISOString(),
      source: 'demo'
    };
  } catch (error) {
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Mock function for searching stocks
export async function dhanSearchStocks({ query }) {
  try {
    // Sample stock data
    const sampleStocks = [
      { symbol: 'RELIANCE', company_name: 'Reliance Industries', current_price: 2456.75, change_percent: 2.34, volume: 1234567 },
      { symbol: 'TCS', company_name: 'Tata Consultancy Services', current_price: 3842.50, change_percent: -1.23, volume: 987654 },
      { symbol: 'HDFCBANK', company_name: 'HDFC Bank', current_price: 1654.30, change_percent: 0.87, volume: 2345678 },
      { symbol: 'INFY', company_name: 'Infosys', current_price: 1567.25, change_percent: 1.45, volume: 1567890 },
      { symbol: 'ICICIBANK', company_name: 'ICICI Bank', current_price: 956.40, change_percent: -0.56, volume: 3456789 },
    ];
    // Filter by query if provided (simple string match on symbol or name)
    const filteredStocks = query 
      ? sampleStocks.filter(stock => 
          stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
          stock.company_name.toLowerCase().includes(query.toLowerCase())
        )
      : sampleStocks;
    const gainers = filteredStocks.filter(s => s.change_percent > 0).slice(0, 5);
    const losers = filteredStocks.filter(s => s.change_percent < 0).slice(0, 5);
    return {
      stocks: filteredStocks,
      gainers: gainers,
      losers: losers,
      timestamp: new Date().toISOString(),
      source: 'demo',
      fallback: false
    };
  } catch (error) {
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Mock function for Yahoo market data (similar to Dhan for demo purposes)
export async function yahooGetMarketData({ symbols = [] }) {
  try {
    // Sample market data (reusing similar structure)
    const sampleStocks = [
      { symbol: 'AAPL', current_price: 225.45, change_percent: 1.12, volume: 5432109 },
      { symbol: 'GOOGL', current_price: 148.76, change_percent: -0.45, volume: 2345678 },
      { symbol: 'MSFT', current_price: 412.30, change_percent: 0.89, volume: 3456789 },
      { symbol: 'TSLA', current_price: 248.90, change_percent: 2.67, volume: 4567890 },
      { symbol: 'AMZN', current_price: 185.20, change_percent: -1.23, volume: 5678901 },
    ];
    const gainers = sampleStocks
      .filter(s => s.change_percent > 0)
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, 5);
    const losers = sampleStocks
      .filter(s => s.change_percent < 0)
      .sort((a, b) => a.change_percent - b.change_percent)
      .slice(0, 5);
    return {
      stocks: sampleStocks,
      gainers: gainers,
      losers: losers,
      timestamp: new Date().toISOString(),
      source: 'demo'
    };
  } catch (error) {
    return {
      error: error.message,
      fallback: true
    };
  }
}

// Mock auth function - simulates authentication without real checks
export async function exampleAuthFunction({ userId, password }) {
  try {
    // Simple demo: always succeed for sample users
    if (userId === 'demo' && password === 'password') {
      return {
        success: true,
        token: 'mock-jwt-token-12345',
        user: { id: userId, role: 'user' },
        expires: new Date(Date.now() + 3600000).toISOString() // 1 hour
      };
    } else {
      return {
        success: false,
        error: 'Invalid credentials (demo mode)'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Mock function for sending advisor post notifications
export async function sendAdvisorPostNotifications({ postId, advisorId, advisorName, postTitle }) {
  try {
    console.log('Demo: Notifications would be sent for post', postId);
    return {
      success: true,
      notifications_sent: 5,
      emails_queued: 5,
      sms_queued: 3,
      message: 'Notifications sent (demo mode)'
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
}

// Mock function for tracking recommendation performance
export async function trackRecommendationPerformance() {
  try {
    console.log('Demo: Recommendation performance tracking running');
    return {
      success: true,
      total_checked: 10,
      updated: 8,
      targets_hit: 3,
      stop_losses_hit: 1,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
}

// Mock function for sending event reminders (similar to notifications)
export async function sendEventReminders({ eventId, eventTitle, attendees = [] }) {
  try {
    console.log('Demo: Event reminders would be sent for', eventId);
    return {
      success: true,
      reminders_sent: attendees.length || 10,
      emails_queued: attendees.length || 10,
      sms_queued: Math.floor((attendees.length || 10) / 2),
      message: 'Event reminders sent (demo mode)',
      details: attendees.slice(0, 3).map(a => ({ attendee: a, sent: true })) // Sample details
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
}

// Mock function for sending feedback requests
export async function sendFeedbackRequests({ eventId }) {
  try {
    console.log('Demo: Feedback requests would be sent');
    return {
      success: true,
      feedbackRequestsSent: 8,
      details: [
        { event: eventId || 'Technical Analysis Workshop', user: 'Demo User' }
      ]
    };
  } catch (error) {
    return { 
      error: error.message, 
      success: false 
    };
  }
}