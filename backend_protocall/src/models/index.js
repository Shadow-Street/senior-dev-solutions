const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "my_database",
  process.env.DB_USER || "root",
  process.env.DB_PASS || null,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  }
);

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ============ CORE MODELS ============

// User & Auth
db.User = require("./User")(sequelize);
db.OauthToken = require("./Auth/OauthToken")(sequelize);
db.Role = require("./Role")(sequelize);

// Stocks
db.Stock = require("./Stock")(sequelize);

// Pledges
db.Pledge = require("./Pledge")(sequelize);
db.PledgeSession = require("./PledgeSession")(sequelize);
db.PledgeExecutionRecord = require("./PledgeExecutionRecord")(sequelize);
db.PledgeAccessRequest = require("./PledgeAccessRequest")(sequelize);
db.PledgeAuditLog = require("./PledgeAuditLog")(sequelize);
db.PledgePayment = require("./PledgePayment")(sequelize);
db.AdvisorPledgeAccessRequest = require("./AdvisorPledgeAccessRequest")(sequelize);

// Funds
db.FundTransaction = require("./FundTransaction")(sequelize);
db.FundAllocation = require("./FundAllocation")(sequelize);
db.FundPlan = require("./FundPlan")(sequelize);
db.FundWallet = require("./FundWallet")(sequelize);
db.FundNotification = require("./FundNotification")(sequelize);
db.FundWithdrawalRequest = require("./FundWithdrawalRequest")(sequelize);
db.FundPayoutRequest = require("./FundPayoutRequest")(sequelize);
db.FundInvoice = require("./FundInvoice")(sequelize);

// User Profile & Trust
db.TrustScoreLog = require("./TrustScoreLog")(sequelize);
db.Advisor = require("./Advisor")(sequelize);
db.UserInvestment = require("./UserInvestment")(sequelize);

// Investments
db.Investor = require("./Investor")(sequelize);
db.InvestmentRequest = require("./InvestmentRequest")(sequelize);
db.InvestorRequest = require("./InvestorRequest")(sequelize);

// Events
db.Event = require("./Event")(sequelize);
db.EventTicket = require("./EventTicket")(sequelize);
db.EventAttendee = require("./EventAttendee")(sequelize);
db.EventReview = require("./EventReview")(sequelize);
db.EventCommissionTracking = require("./EventCommissionTracking")(sequelize);
db.RefundRequest = require("./RefundRequest")(sequelize);
db.EventCheckIn = require("./EventCheckIn")(sequelize);
db.EventPromoCode = require("./EventPromoCode")(sequelize);
db.EventReminder = require("./EventReminder")(sequelize);
db.EventFeedback = require("./EventFeedback")(sequelize);
db.EventOrganizer = require("./EventOrganizer")(sequelize);

// Finfluencers & Courses
db.FinInfluencer = require("./FinInfluencer")(sequelize);
db.Course = require("./Course")(sequelize);
db.CourseEnrollment = require("./CourseEnrollment")(sequelize);
db.InfluencerPost = require("./InfluencerPost")(sequelize);

// Revenue & Payouts
db.RevenueTransaction = require("./RevenueTransaction")(sequelize);
db.PayoutRequest = require("./PayoutRequest")(sequelize);

// Moderation
db.ModerationLog = require("./ModerationLog")(sequelize);
db.ContactInquiry = require("./ContactInquiry")(sequelize);
db.Feedback = require("./Feedback")(sequelize);

// Subscriptions
db.PromoCode = require("./PromoCode")(sequelize);
db.SubscriptionTransaction = require("./SubscriptionTransaction")(sequelize);
db.Subscription = require("./Subscription")(sequelize);
db.SubscriptionPlan = require("./SubscriptionPlan")(sequelize);

// Polls
db.Poll = require("./Poll")(sequelize);
db.PollVote = require("./PollVote")(sequelize);

// Referrals
db.Referral = require("./Referral")(sequelize);
db.ReferralBadge = require("./ReferralBadge")(sequelize);

// Chat & Messaging
db.Message = require("./Message")(sequelize);
db.MessageReaction = require("./MessageReaction")(sequelize);
db.ChatRoom = require("./ChatRoom")(sequelize);
db.ChatRoomParticipant = require("./ChatRoomParticipant")(sequelize);
db.Meeting = require("./Meeting")(sequelize);
db.TypingIndicator = require("./TypingIndicator")(sequelize);

// News & Content
db.News = require("./News")(sequelize);

// Notifications
db.Notification = require("./Notification")(sequelize);
db.NotificationSetting = require("./NotificationSetting")(sequelize);

// Features & Config
db.FeatureConfig = require("./FeatureConfig")(sequelize);
db.PlatformSetting = require("./PlatformSetting")(sequelize);
db.EntityConfig = require("./EntityConfig")(sequelize);

// Audit & Modules
db.AuditLog = require("./AuditLog")(sequelize);
db.ModuleApprovalRequest = require("./ModuleApprovalRequest")(sequelize);

// Reviews
db.Review = require("./Review")(sequelize);

// Advisors
db.AdvisorRecommendation = require("./AdvisorRecommendation")(sequelize);
db.AdvisorPledgeCommission = require("./AdvisorPledgeCommission")(sequelize);

// Ads & Campaigns
db.AdCampaign = require("./AdCampaign")(sequelize);
db.AdTransaction = require("./AdTransaction")(sequelize);
db.CampaignBilling = require("./CampaignBilling")(sequelize);
db.Vendor = require("./Vendor")(sequelize);

// Alerts
db.AlertConfiguration = require("./AlertConfiguration")(sequelize);

// Portfolio & Watchlist
db.Watchlist = require("./Watchlist")(sequelize);
db.Portfolio = require("./Portfolio")(sequelize);
db.PortfolioHolding = require("./PortfolioHolding")(sequelize);

// Chatbots
db.ChatBot = require("./ChatBot")(sequelize);
db.BotConversation = require("./BotConversation")(sequelize);

// Reports & Analytics
db.Report = require("./Report")(sequelize);
db.AnalyticsEvent = require("./AnalyticsEvent")(sequelize);

// ============ ASSOCIATIONS ============

// User associations
db.User.hasMany(db.Pledge, { foreignKey: 'user_id' });
db.Pledge.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.PledgeSession, { foreignKey: 'user_id' });
db.PledgeSession.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.FundTransaction, { foreignKey: 'user_id' });
db.FundTransaction.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.Message, { foreignKey: 'user_id' });
db.Message.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.Notification, { foreignKey: 'user_id' });
db.Notification.belongsTo(db.User, { foreignKey: 'user_id' });

db.ChatRoom.hasMany(db.Message, { foreignKey: 'chat_room_id' });
db.Message.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

db.ChatRoom.hasMany(db.ChatRoomParticipant, { foreignKey: 'chat_room_id' });
db.ChatRoomParticipant.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

db.Event.hasMany(db.EventTicket, { foreignKey: 'event_id' });
db.EventTicket.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventAttendee, { foreignKey: 'event_id' });
db.EventAttendee.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Poll.hasMany(db.PollVote, { foreignKey: 'poll_id' });
db.PollVote.belongsTo(db.Poll, { foreignKey: 'poll_id' });

db.Course.hasMany(db.CourseEnrollment, { foreignKey: 'course_id' });
db.CourseEnrollment.belongsTo(db.Course, { foreignKey: 'course_id' });

module.exports = db;