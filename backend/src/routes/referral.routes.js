const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const PlatformSettings = require("../services/PlatformSettingsService");

/**
 * Referral programme switch (Platform Settings > Referral Settings).
 * While paused no new codes are issued and no new referrals are recorded;
 * existing referrals and stats stay readable.
 */
const requireReferralsEnabled = async (_req, res, next) => {
  let enabled = true;
  try { enabled = (await PlatformSettings.getValue('referral_system_enabled')) !== false; } catch { enabled = true; }
  if (enabled) return next();
  return res.status(403).json({ error: 'The referral programme is currently paused.', code: 'REFERRALS_DISABLED' });
};

// Referrals CRUD
// Reward and outcome fields are server-controlled: a member could otherwise
// create or edit their own referral as completed with any reward amount, and
// /my-stats would report it as earnings.
const referralController = createCrudController(db.Referral, {
  ownership: 'referrer_id',
  protectedFields: ['status', 'reward_amount', 'reward_paid', 'converted_at'],
  defaultOrderBy: 'created_at',
  defaultOrder: 'DESC'
});

// Get user's referrals
router.get('/my-referrals', authMiddleware, async (req, res) => {
  try {
    const referrals = await db.Referral.findAll({
      where: { referrer_id: req.user.id },
      order: [['created_at', 'DESC']],
      include: [{ 
        model: db.User, 
        as: 'referred',
        attributes: ['id', 'full_name', 'avatar_url', 'created_at'] 
      }]
    });
    res.json(referrals);
  } catch (error) {
    console.error('[referral.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral stats
router.get('/my-stats', authMiddleware, async (req, res) => {
  try {
    const totalReferrals = await db.Referral.count({
      where: { referrer_id: req.user.id }
    });
    
    const successfulReferrals = await db.Referral.count({
      where: { referrer_id: req.user.id, status: 'completed' }
    });
    
    const earnings = await db.Referral.sum('reward_amount', {
      where: { referrer_id: req.user.id, status: 'completed' }
    });
    
    res.json({
      total: totalReferrals,
      successful: successfulReferrals,
      earnings: earnings || 0
    });
  } catch (error) {
    console.error('[referral.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate referral code
router.post('/generate-code', authMiddleware, requireReferralsEnabled, async (req, res) => {
  try {
    const code = `REF${req.user.id.substring(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    
    await db.User.update(
      { referral_code: code },
      { where: { id: req.user.id } }
    );
    
    res.json({ code });
  } catch (error) {
    console.error('[referral.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply referral code
router.post('/apply', authMiddleware, requireReferralsEnabled, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (typeof code !== 'string' || !code.trim() || code.length > 64) {
      return res.status(400).json({ error: 'A referral code is required' });
    }

    const referrer = await db.User.findOne({
      where: { referral_code: code }
    });
    
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    if (referrer.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot use your own referral code' });
    }
    
    // Check if already referred
    const existing = await db.Referral.findOne({
      where: { referred_id: req.user.id }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Already used a referral code' });
    }
    
    // The inviter reward is the configured amount at the time the code is
    // used, so a later change to the setting does not rewrite past referrals.
    let rewardAmount = null;
    try { rewardAmount = await PlatformSettings.getValue('referral_inviter_bonus'); } catch { rewardAmount = null; }

    const referral = await db.Referral.create({
      referrer_id: referrer.id,
      referred_id: req.user.id,
      code,
      status: 'pending',
      reward_amount: rewardAmount,
      created_at: new Date()
    });
    
    res.status(201).json(referral);
  } catch (error) {
    console.error('[referral.routes.js] request failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Referral Badges sub-routes
const badgeRouter = express.Router();
const badgeController = createCrudController(db.ReferralBadge);
// Badges are a platform catalogue: members may read them, only
// admins may define them (any member could previously create or delete one).
createCrudRoutes(badgeRouter, badgeController, { read: [authMiddleware], write: [authMiddleware, adminMiddleware] });
router.use('/badges', badgeRouter);


// CRUD LAST — the generated '/:id' route must not shadow the sub-routers
// mounted above. Registered earlier, '/clients', '/participants' and the
// like were matched as an id and answered 404 'Record not found'.
// A paused programme records no new referrals through the generic create
// either; when the gate passes, next() falls through to the CRUD create.
router.post('/', authMiddleware, requireReferralsEnabled, (_req, _res, next) => next());
createCrudRoutes(router, referralController, [authMiddleware]);

module.exports = router;
