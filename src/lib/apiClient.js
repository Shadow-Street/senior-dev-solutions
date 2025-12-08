import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  async login(email, password, role = 'user') {
    const response = await apiClient.post('/auth/login', { email, password, role });
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async me() {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },
};

// Generic Entity API creator
function createEntityAPI(endpoint) {
  return {
    async list(orderBy = 'created_at', limit = 100, offset = 0) {
      const response = await apiClient.get(endpoint, {
        params: { limit, offset }
      });
      return response.data;
    },

    async filter(filters = {}, orderBy = 'created_at', limit = 100) {
      const response = await apiClient.get(endpoint, {
        params: { ...filters, limit }
      });
      return response.data;
    },

    async get(id) {
      const response = await apiClient.get(`${endpoint}/${id}`);
      return response.data;
    },

    async create(data) {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    },

    async update(id, data) {
      const response = await apiClient.put(`${endpoint}/${id}`, data);
      return response.data;
    },

    async delete(id) {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response.data;
    },
  };
}

// Entity APIs - Comprehensive list
// Pledge & Session Management
export const Pledge = createEntityAPI('/pledges/pledges');
export const PledgeSession = createEntityAPI('/pledges/sessions');
export const PledgeExecutionRecord = createEntityAPI('/pledges/executions');
export const PledgeAccessRequest = createEntityAPI('/pledges/access-requests');
export const PledgeAuditLog = createEntityAPI('/pledges/audit-logs');
export const AdvisorPledgeAccessRequest = createEntityAPI('/pledges/advisor-access-requests');

// Fund Management
export const FundTransaction = createEntityAPI('/funds/transactions');
export const FundAllocation = createEntityAPI('/funds/allocations');
export const FundPlan = createEntityAPI('/funds/plans');
export const FundWallet = createEntityAPI('/funds/wallets');
export const FundNotification = createEntityAPI('/funds/notifications');
export const FundWithdrawalRequest = createEntityAPI('/funds/withdrawals');
export const FundPayoutRequest = createEntityAPI('/funds/payouts');
export const FundInvoice = createEntityAPI('/funds/invoices');

// User & Profile Management
export const User = createEntityAPI('/users');
export const TrustScoreLog = createEntityAPI('/users/trust-score-logs');
export const Advisor = createEntityAPI('/users/advisors');
export const UserInvestment = createEntityAPI('/users/investments');

// Investment & Investor Management
export const Investor = createEntityAPI('/investments/investors');
export const InvestmentRequest = createEntityAPI('/investments/requests');
export const InvestorRequest = createEntityAPI('/investments/investor-requests');

// Stock Management
export const Stock = createEntityAPI('/stocks');

// Events Management
export const Event = createEntityAPI('/events');
export const EventTicket = createEntityAPI('/events/tickets');
export const EventAttendee = createEntityAPI('/events/attendees');
export const EventReview = createEntityAPI('/events/reviews');
export const EventCommissionTracking = createEntityAPI('/events/commissions');
export const RefundRequest = createEntityAPI('/events/refunds');
export const EventCheckIn = createEntityAPI('/events/check-ins');
export const EventPromoCode = createEntityAPI('/events/promo-codes');
export const EventReminder = createEntityAPI('/events/reminders');
export const EventFeedback = createEntityAPI('/events/feedback');

// FinInfluencer & Courses
export const FinInfluencer = createEntityAPI('/finfluencers');
export const Course = createEntityAPI('/courses');
export const CourseEnrollment = createEntityAPI('/courses/enrollments');

// Revenue & Payouts
export const RevenueTransaction = createEntityAPI('/revenue/transactions');
export const PayoutRequest = createEntityAPI('/revenue/payouts');

// Moderation & Compliance
export const ModerationLog = createEntityAPI('/moderation/logs');
export const ContactInquiry = createEntityAPI('/moderation/inquiries');
export const Feedback = createEntityAPI('/moderation/feedback');

// Subscriptions & Payments
export const PromoCode = createEntityAPI('/subscriptions/promo-codes');
export const SubscriptionTransaction = createEntityAPI('/subscriptions/transactions');
export const Subscription = createEntityAPI('/subscriptions');

// Polls & Community
export const Poll = createEntityAPI('/polls');
export const PollVote = createEntityAPI('/polls/votes');

// Referrals
export const Referral = createEntityAPI('/referrals');
export const ReferralBadge = createEntityAPI('/referrals/badges');

// Chat & Messaging
export const Message = createEntityAPI('/messages');
export const MessageReaction = createEntityAPI('/messages/reactions');
export const ChatRoom = createEntityAPI('/chatrooms');
export const ChatRoomParticipant = createEntityAPI('/chatrooms/participants');
export const Meeting = createEntityAPI('/meetings');
export const TypingIndicator = createEntityAPI('/typing-indicators');

// Platform Settings
export const PlatformSetting = createEntityAPI('/platform/settings');

// News & Content
export const News = createEntityAPI('/news');
export const PledgePayment = createEntityAPI('/pledges/payments');

// Notifications
export const Notification = createEntityAPI('/notifications');
export const NotificationSetting = createEntityAPI('/notifications/settings');

// Additional Entities
export const InfluencerPost = createEntityAPI('/influencers/posts');
export const EventOrganizer = createEntityAPI('/events/organizers');
export const SubscriptionPlan = createEntityAPI('/subscriptions/plans');
export const AuditLog = createEntityAPI('/audit/logs');
export const AdTransaction = createEntityAPI('/ads/transactions');
export const ModuleApprovalRequest = createEntityAPI('/modules/approvals');
export const Review = createEntityAPI('/reviews');

// Advisor & Recommendations
export const AdvisorRecommendation = createEntityAPI('/advisors/recommendations');
export const AdvisorPledgeCommission = createEntityAPI('/advisors/pledge-commissions');

// Ads & Campaigns
export const AdCampaign = createEntityAPI('/ads/campaigns');
export const Vendor = createEntityAPI('/vendors');
export const CampaignBilling = createEntityAPI('/ads/billing');

// Alerts & Configuration
export const AlertConfiguration = createEntityAPI('/alerts/configurations');
export const AlertSetting = createEntityAPI('/alerts/settings');
export const EntityConfig = createEntityAPI('/entity-configs');

// Commission Tracking (for superadmin dashboard)
export const CommissionTracking = createEntityAPI('/commissions/tracking');
export const CommissionSettings = createEntityAPI('/commissions/settings');

// Read Receipts
export const MessageReadReceipt = createEntityAPI('/messages/read-receipts');

// User Roles
export const Role = createEntityAPI('/roles');
export const RoleTemplate = createEntityAPI('/roles/templates');
export const RoleTemplatePermission = createEntityAPI('/roles/template-permissions');
export const RolePermission = createEntityAPI('/roles/permissions');
export const Permission = createEntityAPI('/permissions');

// Watchlist & Portfolios
export const Watchlist = createEntityAPI('/watchlists');
export const Portfolio = createEntityAPI('/portfolios');
export const PortfolioHolding = createEntityAPI('/portfolios/holdings');

// Chat Bots
export const ChatBot = createEntityAPI('/chatbots');
export const BotConversation = createEntityAPI('/chatbots/conversations');

// Reports & Analytics
export const Report = createEntityAPI('/reports');
export const AnalyticsEvent = createEntityAPI('/analytics/events');

// Feature Configuration
export const FeatureConfig = {
  async list() {
    const response = await apiClient.get('/features');
    return response.data;
  },
  async get(key) {
    const response = await apiClient.get(`/features/${key}`);
    return response.data;
  },
};

// Legacy aliases for backward compatibility
export const PledgeAPI = Pledge;
export const PledgeSessionAPI = PledgeSession;
export const PledgeExecutionRecordAPI = PledgeExecutionRecord;
export const PledgeAccessRequestAPI = PledgeAccessRequest;
export const FundTransactionAPI = FundTransaction;
export const FeatureConfigAPI = FeatureConfig;

export default apiClient;
