const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const pledgeRoutes = require("./pledge.routes");
const fundRoutes = require("./fund.routes");
const featureRoutes = require("./feature.routes");
const stockRoutes = require("./stock.routes");
const eventRoutes = require("./event.routes");
const chatRoutes = require("./chat.routes");
const subscriptionRoutes = require("./subscription.routes");
const notificationRoutes = require("./notification.routes");
const advisorRoutes = require("./advisor.routes");
const investmentRoutes = require("./investment.routes");
const finfluencerRoutes = require("./finfluencer.routes");
const courseRoutes = require("./course.routes");
const pollRoutes = require("./poll.routes");
const referralRoutes = require("./referral.routes");
const moderationRoutes = require("./moderation.routes");
const revenueRoutes = require("./revenue.routes");
const newsRoutes = require("./news.routes");
const adsRoutes = require("./ads.routes");
const platformRoutes = require("./platform.routes");
const alertRoutes = require("./alert.routes");
const reviewRoutes = require("./review.routes");
const vendorRoutes = require("./vendor.routes");
const watchlistRoutes = require("./watchlist.routes");
const portfolioRoutes = require("./portfolio.routes");
const chatbotRoutes = require("./chatbot.routes");
const reportRoutes = require("./report.routes");
const analyticsRoutes = require("./analytics.routes");
const fileRoutes = require("./file.routes");
const emailRoutes = require("./email.routes");

const router = express.Router();

// Auth & Users
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/roles", require("./role.routes"));

// Core Business
router.use("/pledges", pledgeRoutes);
router.use("/funds", fundRoutes);
router.use("/stocks", stockRoutes);
router.use("/investments", investmentRoutes);

// Events
router.use("/events", eventRoutes);

// Chat & Messaging
router.use("/chatrooms", chatRoutes);
router.use("/messages", require("./message.routes"));
router.use("/meetings", require("./meeting.routes"));
router.use("/typing-indicators", require("./typing.routes"));

// Subscriptions & Payments
router.use("/subscriptions", subscriptionRoutes);

// Notifications
router.use("/notifications", notificationRoutes);

// Advisors & Recommendations
router.use("/advisors", advisorRoutes);

// Content & Learning
router.use("/finfluencers", finfluencerRoutes);
router.use("/influencers", require("./influencer.routes"));
router.use("/courses", courseRoutes);
router.use("/news", newsRoutes);

// Community
router.use("/polls", pollRoutes);
router.use("/referrals", referralRoutes);
router.use("/reviews", reviewRoutes);

// Moderation & Compliance
router.use("/moderation", moderationRoutes);
router.use("/modules", require("./module.routes"));
router.use("/audit", require("./audit.routes"));

// Revenue & Analytics
router.use("/revenue", revenueRoutes);
router.use("/reports", reportRoutes);
router.use("/analytics", analyticsRoutes);

// Ads & Vendors
router.use("/ads", adsRoutes);
router.use("/vendors", vendorRoutes);

// Platform Configuration
router.use("/platform", platformRoutes);
router.use("/features", featureRoutes);
router.use("/entity-configs", require("./entityconfig.routes"));
router.use("/alerts", alertRoutes);

// Portfolio & Watchlist
router.use("/watchlists", watchlistRoutes);
router.use("/portfolios", portfolioRoutes);

// Chatbots
router.use("/chatbots", chatbotRoutes);

// Files & Email
router.use("/files", fileRoutes);
router.use("/emails", emailRoutes);

module.exports = router;