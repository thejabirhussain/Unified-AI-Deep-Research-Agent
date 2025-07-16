const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscription');
const CreditManagementService = require('./creditManagementService');

class SubscriptionService {
  constructor() {
    this.PLANS = {
      basic: {
        price: 9.99,
        priceId: process.env.STRIPE_BASIC_PRICE_ID
      },
      pro: {
        price: 29.99,
        priceId: process.env.STRIPE_PRO_PRICE_ID
      },
      enterprise: {
        price: 99.99,
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID
      }
    };
  }

  async createSubscription(userId, plan, paymentMethodId) {
    const customer = await stripe.customers.create({
      payment_method: paymentMethodId,
      email: user.email,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: this.PLANS[plan].priceId }],
      expand: ['latest_invoice.payment_intent']
    });

    const newSubscription = await Subscription.create({
      userId,
      plan,
      status: 'active',
      price: this.PLANS[plan].price,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id
    });

    await CreditManagementService.distributeCredits(this.PLANS[plan].price, userId);

    return newSubscription;
  }

  async cancelSubscription(userId) {
    const subscription = await Subscription.findOne({ userId });
    
    if (subscription) {
      await stripe.subscriptions.del(subscription.stripeSubscriptionId);
      
      subscription.status = 'cancelled';
      subscription.autoRenew = false;
      await subscription.save();
    }

    return subscription;
  }

  async getSubscriptionStatus(userId) {
    return await Subscription.findOne({ userId });
  }
}

module.exports = new SubscriptionService();