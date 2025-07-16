const Subscription = require('../models/subscription');
const creditService = require('../services/creditService');

const checkSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(403).json({ 
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Subscription check failed' });
  }
};

const checkAccess = async (req, res, next) => {
  try {
    const { model } = req.body;
    
    // Gemini is free for all
    if (model === 'gemini') {
      return next();
    }

    const credits = await creditService.checkCredits(req.user._id, model);
    
    if (credits <= 0) {
      return res.status(403).json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    // Deduct 1 credit for usage
    await creditService.deductCredits(req.user._id, model);
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkSubscription, checkAccess };