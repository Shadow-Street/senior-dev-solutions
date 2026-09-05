const express = require("express");
const router = express.Router();
const db = require("../models");
const { createCrudController, createCrudRoutes } = require("../utils/crudController");
const { authMiddleware } = require("../middleware/auth");

// Referrals CRUD
const referralController = createCrudController(db.Referral, {
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// Generate referral code
router.post('/generate-code', authMiddleware, async (req, res) => {
  try {
    const code = `REF${req.user.id.substring(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
    
    await db.User.update(
      { referral_code: code },
      { where: { id: req.user.id } }
    );
    
    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply referral code
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    
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
    
    const referral = await db.Referral.create({
      referrer_id: referrer.id,
      referred_id: req.user.id,
      code,
      status: 'pending',
      created_at: new Date()
    });
    
    res.status(201).json(referral);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD routes
createCrudRoutes(router, referralController);

// Referral Badges sub-routes
const badgeRouter = express.Router();
const badgeController = createCrudController(db.ReferralBadge);
createCrudRoutes(badgeRouter, badgeController);
router.use('/badges', badgeRouter);

module.exports = router;