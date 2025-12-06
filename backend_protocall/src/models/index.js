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

// Import all models from AllModels.js
const AllModels = require("./AllModels");

// Initialize all models with sequelize
Object.keys(AllModels).forEach(modelName => {
  db[modelName] = AllModels[modelName](sequelize);
});

// Import specific models that have custom definitions
db.User = require("./User")(sequelize);
db.OauthToken = require("./Auth/OauthToken")(sequelize);
db.Stock = require("./Stock")(sequelize);
db.Pledge = require("./Pledge")(sequelize);
db.PledgeSession = require("./PledgeSession")(sequelize);
db.PledgeExecutionRecord = require("./PledgeExecutionRecord")(sequelize);
db.PledgeAccessRequest = require("./PledgeAccessRequest")(sequelize);
db.FundTransaction = require("./FundTransaction")(sequelize);
db.FeatureConfig = require("./FeatureConfig")(sequelize);

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

db.User.hasMany(db.AlertSetting, { foreignKey: 'user_id' });
db.AlertSetting.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.Watchlist, { foreignKey: 'user_id' });
db.Watchlist.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasMany(db.Portfolio, { foreignKey: 'user_id' });
db.Portfolio.belongsTo(db.User, { foreignKey: 'user_id' });

// ChatRoom associations
db.ChatRoom.hasMany(db.Message, { foreignKey: 'chat_room_id' });
db.Message.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

db.ChatRoom.hasMany(db.ChatRoomParticipant, { foreignKey: 'chat_room_id' });
db.ChatRoomParticipant.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

db.ChatRoom.hasMany(db.Meeting, { foreignKey: 'chat_room_id' });
db.Meeting.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

db.ChatRoom.hasMany(db.Poll, { foreignKey: 'chat_room_id' });
db.Poll.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

db.ChatRoom.hasMany(db.TypingIndicator, { foreignKey: 'chat_room_id' });
db.TypingIndicator.belongsTo(db.ChatRoom, { foreignKey: 'chat_room_id' });

// Event associations
db.Event.hasMany(db.EventTicket, { foreignKey: 'event_id' });
db.EventTicket.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventAttendee, { foreignKey: 'event_id' });
db.EventAttendee.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventReview, { foreignKey: 'event_id' });
db.EventReview.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventCheckIn, { foreignKey: 'event_id' });
db.EventCheckIn.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventPromoCode, { foreignKey: 'event_id' });
db.EventPromoCode.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventReminder, { foreignKey: 'event_id' });
db.EventReminder.belongsTo(db.Event, { foreignKey: 'event_id' });

db.Event.hasMany(db.EventFeedback, { foreignKey: 'event_id' });
db.EventFeedback.belongsTo(db.Event, { foreignKey: 'event_id' });

// Poll associations
db.Poll.hasMany(db.PollVote, { foreignKey: 'poll_id' });
db.PollVote.belongsTo(db.Poll, { foreignKey: 'poll_id' });

// Course associations
db.Course.hasMany(db.CourseEnrollment, { foreignKey: 'course_id' });
db.CourseEnrollment.belongsTo(db.Course, { foreignKey: 'course_id' });

// Message associations
db.Message.hasMany(db.MessageReaction, { foreignKey: 'message_id' });
db.MessageReaction.belongsTo(db.Message, { foreignKey: 'message_id' });

// Portfolio associations
db.Portfolio.hasMany(db.PortfolioHolding, { foreignKey: 'portfolio_id' });
db.PortfolioHolding.belongsTo(db.Portfolio, { foreignKey: 'portfolio_id' });

// Subscription associations
db.Subscription.belongsTo(db.SubscriptionPlan, { foreignKey: 'plan_id' });
db.SubscriptionPlan.hasMany(db.Subscription, { foreignKey: 'plan_id' });

db.Subscription.hasMany(db.SubscriptionTransaction, { foreignKey: 'subscription_id' });
db.SubscriptionTransaction.belongsTo(db.Subscription, { foreignKey: 'subscription_id' });

// AdCampaign associations
db.AdCampaign.hasMany(db.AdTransaction, { foreignKey: 'campaign_id' });
db.AdTransaction.belongsTo(db.AdCampaign, { foreignKey: 'campaign_id' });

db.AdCampaign.hasMany(db.CampaignBilling, { foreignKey: 'campaign_id' });
db.CampaignBilling.belongsTo(db.AdCampaign, { foreignKey: 'campaign_id' });

// ChatBot associations
db.ChatBot.hasMany(db.BotConversation, { foreignKey: 'bot_id' });
db.BotConversation.belongsTo(db.ChatBot, { foreignKey: 'bot_id' });

// Referral associations
db.User.hasMany(db.Referral, { foreignKey: 'referrer_id', as: 'referralsMade' });
db.User.hasMany(db.Referral, { foreignKey: 'referred_id', as: 'referredBy' });

// Advisor associations
db.Advisor.hasMany(db.AdvisorRecommendation, { foreignKey: 'advisor_id' });
db.AdvisorRecommendation.belongsTo(db.Advisor, { foreignKey: 'advisor_id' });

db.Advisor.hasMany(db.AdvisorPledgeCommission, { foreignKey: 'advisor_id' });
db.AdvisorPledgeCommission.belongsTo(db.Advisor, { foreignKey: 'advisor_id' });

// FinInfluencer associations
db.FinInfluencer.hasMany(db.InfluencerPost, { foreignKey: 'influencer_id' });
db.InfluencerPost.belongsTo(db.FinInfluencer, { foreignKey: 'influencer_id' });

db.FinInfluencer.hasMany(db.Subscription, { foreignKey: 'finfluencer_id' });
db.Subscription.belongsTo(db.FinInfluencer, { foreignKey: 'finfluencer_id' });

module.exports = db;
