// This file exports model factory functions for all entities
const { DataTypes } = require("sequelize");

const createModel = (tableName, fields) => (sequelize) => {
  return sequelize.define(tableName, {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ...fields,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName, timestamps: false });
};

// Export all model factories
module.exports = {
  // Roles & Permissions
  Role: createModel('roles', { 
    name: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    permissions: DataTypes.JSON 
  }),

  // Pledge Related
  PledgeAuditLog: createModel('pledge_audit_logs', { 
    pledge_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    action: DataTypes.STRING, 
    details: DataTypes.JSON 
  }),
  PledgePayment: createModel('pledge_payments', { 
    pledge_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(10,2), 
    status: DataTypes.STRING,
    payment_method: DataTypes.STRING,
    transaction_id: DataTypes.STRING
  }),
  AdvisorPledgeAccessRequest: createModel('advisor_pledge_access_requests', { 
    advisor_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    pledge_id: DataTypes.UUID,
    status: DataTypes.STRING,
    requested_at: DataTypes.DATE,
    responded_at: DataTypes.DATE
  }),

  // Fund Management
  FundAllocation: createModel('fund_allocations', { 
    fund_id: DataTypes.UUID, 
    stock_symbol: DataTypes.STRING, 
    percentage: DataTypes.DECIMAL(5,2),
    allocation_type: DataTypes.STRING
  }),
  FundPlan: createModel('fund_plans', { 
    name: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    target_return: DataTypes.DECIMAL(5,2),
    risk_level: DataTypes.STRING,
    min_investment: DataTypes.DECIMAL(15,2),
    status: DataTypes.STRING
  }),
  FundWallet: createModel('fund_wallets', { 
    user_id: DataTypes.UUID, 
    balance: DataTypes.DECIMAL(15,2), 
    currency: DataTypes.STRING,
    status: DataTypes.STRING
  }),
  FundNotification: createModel('fund_notifications', { 
    user_id: DataTypes.UUID, 
    fund_id: DataTypes.UUID, 
    message: DataTypes.TEXT,
    type: DataTypes.STRING,
    is_read: DataTypes.BOOLEAN
  }),
  FundWithdrawalRequest: createModel('fund_withdrawal_requests', { 
    user_id: DataTypes.UUID, 
    wallet_id: DataTypes.UUID,
    amount: DataTypes.DECIMAL(15,2), 
    status: DataTypes.STRING,
    bank_details: DataTypes.JSON,
    processed_at: DataTypes.DATE
  }),
  FundPayoutRequest: createModel('fund_payout_requests', { 
    user_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(15,2), 
    status: DataTypes.STRING,
    payout_method: DataTypes.STRING,
    processed_at: DataTypes.DATE
  }),
  FundInvoice: createModel('fund_invoices', { 
    user_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(15,2), 
    status: DataTypes.STRING,
    invoice_number: DataTypes.STRING,
    due_date: DataTypes.DATE,
    paid_at: DataTypes.DATE
  }),

  // User Profile & Trust
  TrustScoreLog: createModel('trust_score_logs', { 
    user_id: DataTypes.UUID, 
    score: DataTypes.INTEGER, 
    previous_score: DataTypes.INTEGER,
    reason: DataTypes.TEXT,
    action_type: DataTypes.STRING
  }),
  Advisor: createModel('advisors', { 
    user_id: DataTypes.UUID, 
    name: DataTypes.STRING, 
    avatar_url: DataTypes.STRING, 
    bio: DataTypes.TEXT, 
    rating: DataTypes.DECIMAL(3,2),
    total_clients: DataTypes.INTEGER,
    total_earnings: DataTypes.DECIMAL(15,2),
    specialization: DataTypes.JSON,
    status: DataTypes.STRING,
    verified: DataTypes.BOOLEAN
  }),
  UserInvestment: createModel('user_investments', { 
    user_id: DataTypes.UUID, 
    stock_symbol: DataTypes.STRING, 
    quantity: DataTypes.DECIMAL(15,4), 
    avg_price: DataTypes.DECIMAL(15,4),
    current_value: DataTypes.DECIMAL(15,2),
    profit_loss: DataTypes.DECIMAL(15,2)
  }),

  // Investors
  Investor: createModel('investors', { 
    user_id: DataTypes.UUID, 
    name: DataTypes.STRING, 
    type: DataTypes.STRING, 
    status: DataTypes.STRING,
    investment_amount: DataTypes.DECIMAL(15,2),
    risk_profile: DataTypes.STRING
  }),
  InvestmentRequest: createModel('investment_requests', { 
    user_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(15,2), 
    status: DataTypes.STRING,
    investment_type: DataTypes.STRING,
    notes: DataTypes.TEXT
  }),
  InvestorRequest: createModel('investor_requests', { 
    user_id: DataTypes.UUID, 
    investor_type: DataTypes.STRING, 
    status: DataTypes.STRING,
    documents: DataTypes.JSON
  }),

  // Events
  Event: createModel('events', { 
    title: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    start_date: DataTypes.DATE, 
    end_date: DataTypes.DATE, 
    location: DataTypes.STRING,
    venue: DataTypes.STRING,
    image_url: DataTypes.STRING,
    status: DataTypes.STRING, 
    organizer_id: DataTypes.UUID,
    max_attendees: DataTypes.INTEGER,
    ticket_price: DataTypes.DECIMAL(10,2),
    category: DataTypes.STRING,
    is_featured: DataTypes.BOOLEAN,
    is_online: DataTypes.BOOLEAN,
    meeting_link: DataTypes.STRING
  }),
  EventTicket: createModel('event_tickets', { 
    event_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    ticket_type: DataTypes.STRING, 
    price: DataTypes.DECIMAL(10,2), 
    status: DataTypes.STRING,
    qr_code: DataTypes.STRING,
    seat_number: DataTypes.STRING
  }),
  EventAttendee: createModel('event_attendees', { 
    event_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    status: DataTypes.STRING, 
    checked_in: DataTypes.BOOLEAN,
    checked_in_at: DataTypes.DATE,
    ticket_id: DataTypes.UUID
  }),
  EventReview: createModel('event_reviews', { 
    event_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    rating: DataTypes.INTEGER, 
    comment: DataTypes.TEXT,
    is_verified: DataTypes.BOOLEAN
  }),
  EventCommissionTracking: createModel('event_commission_tracking', { 
    event_id: DataTypes.UUID, 
    referrer_id: DataTypes.UUID,
    amount: DataTypes.DECIMAL(10,2), 
    status: DataTypes.STRING,
    paid_at: DataTypes.DATE
  }),
  RefundRequest: createModel('refund_requests', { 
    ticket_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    event_id: DataTypes.UUID,
    reason: DataTypes.TEXT, 
    status: DataTypes.STRING,
    refund_amount: DataTypes.DECIMAL(10,2),
    processed_at: DataTypes.DATE
  }),
  EventCheckIn: createModel('event_check_ins', { 
    event_id: DataTypes.UUID, 
    attendee_id: DataTypes.UUID,
    user_id: DataTypes.UUID, 
    checked_in_at: DataTypes.DATE,
    checked_in_by: DataTypes.UUID
  }),
  EventPromoCode: createModel('event_promo_codes', { 
    event_id: DataTypes.UUID, 
    code: DataTypes.STRING, 
    discount_percent: DataTypes.INTEGER,
    discount_amount: DataTypes.DECIMAL(10,2),
    max_uses: DataTypes.INTEGER,
    uses_count: DataTypes.INTEGER,
    expires_at: DataTypes.DATE,
    is_active: DataTypes.BOOLEAN
  }),
  EventReminder: createModel('event_reminders', { 
    event_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    remind_at: DataTypes.DATE,
    reminder_type: DataTypes.STRING,
    is_sent: DataTypes.BOOLEAN
  }),
  EventFeedback: createModel('event_feedback', { 
    event_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    feedback: DataTypes.TEXT, 
    rating: DataTypes.INTEGER,
    category: DataTypes.STRING
  }),
  EventOrganizer: createModel('event_organizers', { 
    user_id: DataTypes.UUID, 
    name: DataTypes.STRING,
    company_name: DataTypes.STRING, 
    status: DataTypes.STRING,
    verified: DataTypes.BOOLEAN,
    total_events: DataTypes.INTEGER
  }),

  // FinInfluencers & Courses
  FinInfluencer: createModel('finfluencers', { 
    user_id: DataTypes.UUID, 
    name: DataTypes.STRING, 
    avatar_url: DataTypes.STRING, 
    bio: DataTypes.TEXT, 
    follower_count: DataTypes.INTEGER, 
    status: DataTypes.STRING, 
    is_featured: DataTypes.BOOLEAN,
    social_links: DataTypes.JSON,
    specialization: DataTypes.JSON,
    rating: DataTypes.DECIMAL(3,2),
    total_subscribers: DataTypes.INTEGER
  }),
  Course: createModel('courses', { 
    title: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    instructor_id: DataTypes.UUID, 
    price: DataTypes.DECIMAL(10,2), 
    status: DataTypes.STRING, 
    category: DataTypes.STRING, 
    is_featured: DataTypes.BOOLEAN, 
    enrollment_count: DataTypes.INTEGER,
    thumbnail_url: DataTypes.STRING,
    duration_hours: DataTypes.INTEGER,
    level: DataTypes.STRING,
    syllabus: DataTypes.JSON,
    rating: DataTypes.DECIMAL(3,2)
  }),
  CourseEnrollment: createModel('course_enrollments', { 
    course_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    status: DataTypes.STRING, 
    progress: DataTypes.INTEGER, 
    enrolled_at: DataTypes.DATE,
    completed_at: DataTypes.DATE,
    certificate_url: DataTypes.STRING
  }),
  InfluencerPost: createModel('influencer_posts', { 
    influencer_id: DataTypes.UUID, 
    content: DataTypes.TEXT, 
    media_urls: DataTypes.JSON, 
    status: DataTypes.STRING,
    likes_count: DataTypes.INTEGER,
    comments_count: DataTypes.INTEGER,
    shares_count: DataTypes.INTEGER,
    is_pinned: DataTypes.BOOLEAN
  }),

  // Revenue & Payouts
  RevenueTransaction: createModel('revenue_transactions', { 
    user_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(15,2), 
    type: DataTypes.STRING, 
    status: DataTypes.STRING,
    source: DataTypes.STRING,
    reference_id: DataTypes.UUID,
    description: DataTypes.TEXT
  }),
  PayoutRequest: createModel('payout_requests', { 
    user_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(15,2), 
    payment_method: DataTypes.STRING, 
    payment_details: DataTypes.JSON, 
    status: DataTypes.STRING,
    processed_at: DataTypes.DATE,
    reference_number: DataTypes.STRING
  }),

  // Moderation & Compliance
  ModerationLog: createModel('moderation_logs', { 
    moderator_id: DataTypes.UUID, 
    action: DataTypes.STRING, 
    target_type: DataTypes.STRING, 
    target_id: DataTypes.UUID, 
    reason: DataTypes.TEXT,
    severity: DataTypes.STRING,
    status: DataTypes.STRING
  }),
  ContactInquiry: createModel('contact_inquiries', { 
    name: DataTypes.STRING, 
    email: DataTypes.STRING, 
    phone: DataTypes.STRING,
    subject: DataTypes.STRING, 
    message: DataTypes.TEXT, 
    status: DataTypes.STRING,
    assigned_to: DataTypes.UUID,
    resolved_at: DataTypes.DATE
  }),
  Feedback: createModel('feedback', { 
    user_id: DataTypes.UUID, 
    type: DataTypes.STRING, 
    category: DataTypes.STRING,
    content: DataTypes.TEXT, 
    status: DataTypes.STRING,
    rating: DataTypes.INTEGER
  }),

  // Subscriptions & Payments
  PromoCode: createModel('promo_codes', { 
    code: DataTypes.STRING, 
    discount_percent: DataTypes.INTEGER,
    discount_amount: DataTypes.DECIMAL(10,2), 
    max_uses: DataTypes.INTEGER, 
    uses_count: DataTypes.INTEGER, 
    expires_at: DataTypes.DATE, 
    is_active: DataTypes.BOOLEAN,
    applicable_to: DataTypes.JSON
  }),
  SubscriptionTransaction: createModel('subscription_transactions', { 
    subscription_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(10,2), 
    status: DataTypes.STRING,
    payment_method: DataTypes.STRING,
    transaction_id: DataTypes.STRING
  }),
  Subscription: createModel('subscriptions', { 
    user_id: DataTypes.UUID, 
    plan_id: DataTypes.UUID, 
    status: DataTypes.STRING, 
    finfluencer_id: DataTypes.UUID, 
    type: DataTypes.STRING,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    auto_renew: DataTypes.BOOLEAN
  }),
  SubscriptionPlan: createModel('subscription_plans', { 
    name: DataTypes.STRING, 
    price: DataTypes.DECIMAL(10,2), 
    interval: DataTypes.STRING, 
    features: DataTypes.JSON,
    description: DataTypes.TEXT,
    is_active: DataTypes.BOOLEAN,
    trial_days: DataTypes.INTEGER
  }),

  // Polls & Community
  Poll: createModel('polls', { 
    chat_room_id: DataTypes.UUID, 
    creator_id: DataTypes.UUID,
    question: DataTypes.STRING, 
    options: DataTypes.JSON, 
    votes: DataTypes.JSON, 
    total_votes: DataTypes.INTEGER, 
    status: DataTypes.STRING, 
    expires_at: DataTypes.DATE,
    is_anonymous: DataTypes.BOOLEAN,
    allow_multiple: DataTypes.BOOLEAN
  }),
  PollVote: createModel('poll_votes', { 
    poll_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    option_index: DataTypes.INTEGER,
    voted_at: DataTypes.DATE
  }),

  // Referrals
  Referral: createModel('referrals', { 
    referrer_id: DataTypes.UUID, 
    referred_id: DataTypes.UUID, 
    code: DataTypes.STRING, 
    status: DataTypes.STRING, 
    reward_amount: DataTypes.DECIMAL(10,2),
    reward_paid: DataTypes.BOOLEAN,
    converted_at: DataTypes.DATE
  }),
  ReferralBadge: createModel('referral_badges', { 
    name: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    required_referrals: DataTypes.INTEGER, 
    image_url: DataTypes.STRING,
    reward_amount: DataTypes.DECIMAL(10,2)
  }),

  // Chat & Messaging
  Message: createModel('messages', { 
    chat_room_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    content: DataTypes.TEXT, 
    is_pinned: DataTypes.BOOLEAN, 
    reply_to_id: DataTypes.UUID,
    message_type: DataTypes.STRING,
    media_urls: DataTypes.JSON,
    is_edited: DataTypes.BOOLEAN,
    edited_at: DataTypes.DATE,
    is_deleted: DataTypes.BOOLEAN
  }),
  MessageReaction: createModel('message_reactions', { 
    message_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    emoji: DataTypes.STRING 
  }),
  ChatRoom: createModel('chat_rooms', { 
    name: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    stock_symbol: DataTypes.STRING, 
    is_public: DataTypes.BOOLEAN, 
    status: DataTypes.STRING, 
    participant_count: DataTypes.INTEGER, 
    owner_id: DataTypes.UUID,
    avatar_url: DataTypes.STRING,
    last_message_at: DataTypes.DATE,
    settings: DataTypes.JSON
  }),
  ChatRoomParticipant: createModel('chat_room_participants', { 
    chat_room_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    role: DataTypes.STRING, 
    joined_at: DataTypes.DATE,
    muted: DataTypes.BOOLEAN,
    last_read_at: DataTypes.DATE
  }),
  Meeting: createModel('meetings', { 
    chat_room_id: DataTypes.UUID, 
    stock_symbol: DataTypes.STRING, 
    meeting_url: DataTypes.STRING, 
    status: DataTypes.STRING, 
    start_time: DataTypes.DATE, 
    end_time: DataTypes.DATE, 
    participant_count: DataTypes.INTEGER, 
    max_participants: DataTypes.INTEGER,
    host_id: DataTypes.UUID,
    recording_url: DataTypes.STRING,
    title: DataTypes.STRING,
    description: DataTypes.TEXT
  }),
  TypingIndicator: createModel('typing_indicators', { 
    chat_room_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    is_typing: DataTypes.BOOLEAN,
    last_typed_at: DataTypes.DATE
  }),

  // News & Content
  News: createModel('news', { 
    title: DataTypes.STRING, 
    content: DataTypes.TEXT, 
    summary: DataTypes.TEXT,
    category: DataTypes.STRING, 
    stock_symbols: DataTypes.STRING, 
    tags: DataTypes.STRING, 
    status: DataTypes.STRING, 
    published_at: DataTypes.DATE,
    author_id: DataTypes.UUID,
    image_url: DataTypes.STRING,
    source: DataTypes.STRING,
    views_count: DataTypes.INTEGER
  }),

  // Notifications
  Notification: createModel('notifications', { 
    user_id: DataTypes.UUID, 
    type: DataTypes.STRING, 
    title: DataTypes.STRING, 
    message: DataTypes.TEXT, 
    is_read: DataTypes.BOOLEAN, 
    data: DataTypes.JSON,
    action_url: DataTypes.STRING,
    priority: DataTypes.STRING
  }),
  NotificationSetting: createModel('notification_settings', { 
    user_id: DataTypes.UUID, 
    email_enabled: DataTypes.BOOLEAN, 
    push_enabled: DataTypes.BOOLEAN, 
    sms_enabled: DataTypes.BOOLEAN,
    preferences: DataTypes.JSON
  }),

  // Platform Settings
  PlatformSetting: createModel('platform_settings', { 
    key: DataTypes.STRING, 
    value: DataTypes.TEXT, 
    category: DataTypes.STRING,
    updated_by: DataTypes.UUID,
    description: DataTypes.TEXT
  }),
  EntityConfig: createModel('entity_configs', { 
    entity_type: DataTypes.STRING, 
    config: DataTypes.JSON, 
    updated_by: DataTypes.UUID,
    is_active: DataTypes.BOOLEAN
  }),

  // Audit & Modules
  AuditLog: createModel('audit_logs', { 
    user_id: DataTypes.UUID, 
    action: DataTypes.STRING, 
    entity_type: DataTypes.STRING, 
    entity_id: DataTypes.UUID, 
    old_data: DataTypes.JSON, 
    new_data: DataTypes.JSON, 
    description: DataTypes.TEXT, 
    ip_address: DataTypes.STRING, 
    user_agent: DataTypes.STRING 
  }),
  ModuleApprovalRequest: createModel('module_approval_requests', { 
    module_name: DataTypes.STRING, 
    requested_by: DataTypes.UUID, 
    status: DataTypes.STRING, 
    approved_by: DataTypes.UUID, 
    approved_at: DataTypes.DATE, 
    rejection_reason: DataTypes.TEXT 
  }),

  // Reviews
  Review: createModel('reviews', { 
    user_id: DataTypes.UUID, 
    entity_type: DataTypes.STRING, 
    entity_id: DataTypes.UUID, 
    rating: DataTypes.INTEGER, 
    title: DataTypes.STRING, 
    content: DataTypes.TEXT, 
    status: DataTypes.STRING,
    is_verified: DataTypes.BOOLEAN,
    helpful_count: DataTypes.INTEGER
  }),

  // Advisor Related
  AdvisorRecommendation: createModel('advisor_recommendations', { 
    advisor_id: DataTypes.UUID, 
    stock_symbol: DataTypes.STRING, 
    action: DataTypes.STRING, 
    target_price: DataTypes.DECIMAL(15,4), 
    stop_loss: DataTypes.DECIMAL(15,4),
    reason: DataTypes.TEXT, 
    status: DataTypes.STRING,
    confidence: DataTypes.INTEGER,
    timeframe: DataTypes.STRING
  }),
  AdvisorPledgeCommission: createModel('advisor_pledge_commissions', { 
    advisor_id: DataTypes.UUID, 
    pledge_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(10,2), 
    status: DataTypes.STRING,
    paid_at: DataTypes.DATE
  }),

  // Ads & Campaigns
  AdCampaign: createModel('ad_campaigns', { 
    advertiser_id: DataTypes.UUID, 
    name: DataTypes.STRING, 
    description: DataTypes.TEXT,
    budget: DataTypes.DECIMAL(15,2), 
    spent: DataTypes.DECIMAL(15,2),
    status: DataTypes.STRING, 
    start_date: DataTypes.DATE, 
    end_date: DataTypes.DATE, 
    priority: DataTypes.INTEGER,
    target_audience: DataTypes.JSON,
    creative_urls: DataTypes.JSON,
    impressions: DataTypes.INTEGER,
    clicks: DataTypes.INTEGER
  }),
  AdTransaction: createModel('ad_transactions', { 
    campaign_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(10,2), 
    type: DataTypes.STRING,
    description: DataTypes.TEXT
  }),
  CampaignBilling: createModel('campaign_billing', { 
    campaign_id: DataTypes.UUID, 
    amount: DataTypes.DECIMAL(15,2), 
    status: DataTypes.STRING,
    invoice_number: DataTypes.STRING,
    due_date: DataTypes.DATE,
    paid_at: DataTypes.DATE
  }),
  Vendor: createModel('vendors', { 
    name: DataTypes.STRING, 
    category: DataTypes.STRING, 
    status: DataTypes.STRING, 
    contact_email: DataTypes.STRING,
    contact_phone: DataTypes.STRING,
    address: DataTypes.TEXT,
    logo_url: DataTypes.STRING,
    verified: DataTypes.BOOLEAN
  }),

  // Alerts
  AlertConfiguration: createModel('alert_configurations', { 
    user_id: DataTypes.UUID, 
    alert_type: DataTypes.STRING, 
    conditions: DataTypes.JSON, 
    is_active: DataTypes.BOOLEAN,
    notification_channels: DataTypes.JSON
  }),
  AlertSetting: createModel('alert_settings', {
    user_id: DataTypes.UUID,
    stock_symbol: DataTypes.STRING,
    alert_type: DataTypes.STRING,
    price_above: DataTypes.DECIMAL(15,4),
    price_below: DataTypes.DECIMAL(15,4),
    percent_change: DataTypes.DECIMAL(5,2),
    volume_threshold: DataTypes.BIGINT,
    is_active: DataTypes.BOOLEAN,
    notification_email: DataTypes.BOOLEAN,
    notification_push: DataTypes.BOOLEAN,
    notification_sms: DataTypes.BOOLEAN,
    last_triggered_at: DataTypes.DATE
  }),

  // Watchlist & Portfolio
  Watchlist: createModel('watchlists', { 
    user_id: DataTypes.UUID, 
    name: DataTypes.STRING, 
    stocks: DataTypes.JSON,
    is_default: DataTypes.BOOLEAN
  }),
  Portfolio: createModel('portfolios', { 
    user_id: DataTypes.UUID, 
    name: DataTypes.STRING, 
    description: DataTypes.TEXT,
    total_value: DataTypes.DECIMAL(15,2),
    total_profit_loss: DataTypes.DECIMAL(15,2),
    is_public: DataTypes.BOOLEAN
  }),
  PortfolioHolding: createModel('portfolio_holdings', { 
    portfolio_id: DataTypes.UUID, 
    stock_symbol: DataTypes.STRING, 
    quantity: DataTypes.DECIMAL(15,4), 
    cost_basis: DataTypes.DECIMAL(15,2), 
    current_value: DataTypes.DECIMAL(15,2),
    avg_buy_price: DataTypes.DECIMAL(15,4),
    profit_loss: DataTypes.DECIMAL(15,2)
  }),

  // Chatbots
  ChatBot: createModel('chat_bots', { 
    name: DataTypes.STRING, 
    type: DataTypes.STRING, 
    description: DataTypes.TEXT, 
    status: DataTypes.STRING, 
    config: DataTypes.JSON,
    avatar_url: DataTypes.STRING,
    welcome_message: DataTypes.TEXT
  }),
  BotConversation: createModel('bot_conversations', { 
    bot_id: DataTypes.UUID, 
    user_id: DataTypes.UUID, 
    session_id: DataTypes.STRING,
    role: DataTypes.STRING, 
    message: DataTypes.TEXT,
    context: DataTypes.JSON
  }),

  // Reports & Analytics
  Report: createModel('reports', { 
    user_id: DataTypes.UUID, 
    type: DataTypes.STRING, 
    name: DataTypes.STRING,
    params: DataTypes.JSON, 
    status: DataTypes.STRING, 
    result_url: DataTypes.STRING, 
    completed_at: DataTypes.DATE,
    file_size: DataTypes.INTEGER,
    format: DataTypes.STRING
  }),
  AnalyticsEvent: createModel('analytics_events', { 
    event_type: DataTypes.STRING, 
    event_data: DataTypes.JSON, 
    user_id: DataTypes.UUID, 
    session_id: DataTypes.STRING,
    page_url: DataTypes.STRING,
    referrer: DataTypes.STRING,
    device_info: DataTypes.JSON
  }),

  // File Storage
  File: createModel('files', {
    user_id: DataTypes.UUID,
    filename: DataTypes.STRING,
    original_name: DataTypes.STRING,
    mime_type: DataTypes.STRING,
    size: DataTypes.INTEGER,
    path: DataTypes.STRING,
    url: DataTypes.STRING,
    entity_type: DataTypes.STRING,
    entity_id: DataTypes.UUID,
    is_public: DataTypes.BOOLEAN
  }),

  // Email Templates
  EmailTemplate: createModel('email_templates', {
    name: DataTypes.STRING,
    subject: DataTypes.STRING,
    body: DataTypes.TEXT,
    type: DataTypes.STRING,
    variables: DataTypes.JSON,
    is_active: DataTypes.BOOLEAN
  }),
  EmailLog: createModel('email_logs', {
    user_id: DataTypes.UUID,
    template_id: DataTypes.UUID,
    to_email: DataTypes.STRING,
    subject: DataTypes.STRING,
    body: DataTypes.TEXT,
    status: DataTypes.STRING,
    sent_at: DataTypes.DATE,
    error_message: DataTypes.TEXT
  }),

  // Static Pages
  StaticPage: createModel('static_pages', {
    slug: DataTypes.STRING,
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    meta_title: DataTypes.STRING,
    meta_description: DataTypes.TEXT,
    status: DataTypes.STRING,
    published_at: DataTypes.DATE
  }),

  // Localization
  Localization: createModel('localizations', {
    key: DataTypes.STRING,
    language: DataTypes.STRING,
    value: DataTypes.TEXT,
    category: DataTypes.STRING
  }),

  // Session & Security
  UserSession: createModel('user_sessions', {
    user_id: DataTypes.UUID,
    token: DataTypes.STRING,
    device_info: DataTypes.JSON,
    ip_address: DataTypes.STRING,
    expires_at: DataTypes.DATE,
    is_active: DataTypes.BOOLEAN
  }),

  // Permissions
  Permission: createModel('permissions', {
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    module: DataTypes.STRING,
    action: DataTypes.STRING
  }),
  RolePermission: createModel('role_permissions', {
    role_id: DataTypes.UUID,
    permission_id: DataTypes.UUID
  }),

  // Commission Tracking
  CommissionTracking: createModel('commission_tracking', {
    user_id: DataTypes.UUID,
    advisor_id: DataTypes.UUID,
    pledge_id: DataTypes.UUID,
    event_id: DataTypes.UUID,
    amount: DataTypes.DECIMAL(15, 2),
    commission_type: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    payout_method: DataTypes.STRING,
    processed_at: DataTypes.DATE,
    paid_at: DataTypes.DATE,
    metadata: DataTypes.JSON
  }),

  // Refund Request
  RefundRequest: createModel('refund_requests', {
    payment_id: DataTypes.UUID,
    user_id: DataTypes.UUID,
    event_id: DataTypes.UUID,
    ticket_id: DataTypes.UUID,
    amount: DataTypes.DECIMAL(15, 2),
    reason: DataTypes.TEXT,
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    processed_at: DataTypes.DATE,
    processed_by: DataTypes.UUID
  }),
};
