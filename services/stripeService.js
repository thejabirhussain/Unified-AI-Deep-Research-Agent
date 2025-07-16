const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user');

class StripeService {
    constructor() {
        this.PLANS = {
            basic: {
                priceId: process.env.STRIPE_BASIC_PRICE_ID,
                price: 9.99,
                credits: 100
            },
            pro: {
                priceId: process.env.STRIPE_PRO_PRICE_ID,
                price: 29.99,
                credits: 500
            }
        };
    }

    async createSubscription(userId, plan, paymentMethodId) {
        const user = await User.findById(userId);
        
        // Create or get customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                payment_method: paymentMethodId,
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });
            customerId = customer.id;
            user.stripeCustomerId = customerId;
            await user.save();
        }

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: this.PLANS[plan].priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            metadata: {
                userId,
                planCredits: this.PLANS[plan].credits
            },
            expand: ['latest_invoice.payment_intent']
        });

        return subscription;
    }

    async getSubscription(userId) {
        const user = await User.findById(userId).select('subscription');
        return user.subscription;
    }

    async cancelSubscription(userId) {
        const user = await User.findById(userId);
        if (!user.subscription?.stripeId) {
            throw new Error('No active subscription found');
        }

        const cancelledSubscription = await stripe.subscriptions.del(
            user.subscription.stripeId
        );

        await User.findByIdAndUpdate(userId, {
            'subscription.status': 'cancelled',
            'subscription.endDate': new Date()
        });

        return { success: true, message: 'Subscription cancelled' };
    }
}

module.exports = new StripeService();