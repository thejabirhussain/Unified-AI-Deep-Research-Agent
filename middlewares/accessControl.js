const { AI_MODELS } = require('../services/aiService');
const User = require('../models/user');
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});

const subscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: { error: 'Subscription rate limit exceeded' }
});

exports.tierLimits = {
    free: {
        perMinuteLimit: 10,
        searchLimit: 50,
        modelLimits: {
            'gpt-3.5': 50,
            'gpt-4': 0,
            // ...other model limits...
        }
    },
    pro: {
        perMinuteLimit: 30,
        searchLimit: 200,
        modelLimits: {
            'gpt-3.5': 200,
            'gpt-4': 50,
            // ...other model limits...
        }
    },
    enterprise: {
        perMinuteLimit: 100,
        searchLimit: 1000,
        modelLimits: {
            'gpt-3.5': 500,
            'gpt-4': 200,
            // ...other model limits...
        }
    }
};

const checkTierAccess = async (req, res, next) => {
    try {
        const { model } = req.body;
        
        // Pro-only models
        const proModels = [
            AI_MODELS.GPT4, 
            AI_MODELS.GPT4_TURBO,
            AI_MODELS.CLAUDE_SONNET,
            AI_MODELS.CLAUDE_OPUS,
            AI_MODELS.GEMINI_PRO,
            AI_MODELS.GEMINI_ULTRA
        ];

        // Check model access
        if (proModels.includes(model) && req.user.tier !== 'pro') {
            return res.status(403).json({ 
                error: 'This model requires a Pro subscription' 
            });
        }

        // Check PDF size limits
        if (req.file) {
            const pdfSize = req.file.size / (1024 * 1024); // Convert to MB
            if (pdfSize > req.user.limits.maxPdfSize) {
                return res.status(400).json({ 
                    error: `PDF size exceeds your tier limit of ${req.user.limits.maxPdfSize}MB`
                });
            }
        }

        next();
    } catch (error) {
        console.error('Access control error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const checkModelAccess = async (req, res, next) => {
    try {
        const { model } = req.body;
        const user = req.user;

        // Gemini is free for all
        if (model === 'gemini') {
            return next();
        }

        // Check if user has active subscription
        if (!user.hasActiveSubscription()) {
            return res.status(403).json({
                error: 'This model requires an active subscription'
            });
        }

        // Check if user has enough credits for the model
        if (user.credits.available[model] <= 0) {
            return res.status(403).json({
                error: 'Insufficient credits for this model'
            });
        }

        // Deduct credit
        await User.findByIdAndUpdate(user._id, {
            $inc: {
                [`credits.available.${model}`]: -1
            }
        });

        next();
    } catch (error) {
        res.status(500).json({ error: 'Access control error' });
    }
};

module.exports = {
    apiLimiter,
    subscriptionLimiter,
    checkTierAccess,
    checkModelAccess
};