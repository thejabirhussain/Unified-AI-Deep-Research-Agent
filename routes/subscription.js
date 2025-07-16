const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');

// Ensure authenticated middleware
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
};

// Display subscription plans
router.get('/plans', ensureAuthenticated, (req, res) => {
    try {
        res.render('subscription', {
            user: req.user,
            stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
            plans: stripeService.PLANS
        });
    } catch (error) {
        console.error('Error rendering subscription page:', error);
        res.status(500).send('Error loading subscription plans');
    }
});

// Create subscription
router.post('/create', ensureAuthenticated, async (req, res) => {
    try {
        const { paymentMethodId, plan } = req.body;
        const subscription = await stripeService.createSubscription(
            req.user._id, 
            plan, 
            paymentMethodId
        );
        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get subscription status
router.get('/status', ensureAuthenticated, async (req, res) => {
    try {
        const subscription = await stripeService.getSubscription(req.user._id);
        res.json(subscription);
    } catch (error) {
        console.error('Error getting subscription status:', error);
        res.status(400).json({ error: error.message });
    }
});

// Cancel subscription
router.post('/cancel', ensureAuthenticated, async (req, res) => {
    try {
        const result = await stripeService.cancelSubscription(req.user._id);
        res.json(result);
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;