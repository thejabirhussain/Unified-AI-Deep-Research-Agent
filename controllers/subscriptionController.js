const stripeService = require('../services/stripeService');
const creditService = require('../services/creditService');
const SubscriptionService = require('../services/subscriptionService');
const CreditManagementService = require('../services/creditManagementService');

class SubscriptionController {
  async createSubscription(req, res) {
    try {
      const { paymentMethodId, plan } = req.body;
      
      // Create or get Stripe customer
      const customer = await stripeService.createCustomer(
        req.user.email, 
        paymentMethodId
      );

      // Create subscription
      const subscription = await stripeService.createSubscription(
        customer.id,
        stripeService.PLANS[plan].priceId
      );

      // Handle the credit distribution
      await creditService.handlePayment(
        stripeService.PLANS[plan].price,
        req.user._id
      );

      // Update user subscription status
      await User.findByIdAndUpdate(req.user._id, {
        'subscription.status': 'active',
        'subscription.plan': plan,
        'subscription.stripeId': subscription.id,
        'subscription.endDate': new Date(subscription.current_period_end * 1000)
      });

      res.json({ subscription });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async cancelSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.cancelSubscription(req.user._id);
      res.json(subscription);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getSubscriptionStatus(req, res) {
    try {
      const status = await SubscriptionService.getSubscriptionStatus(req.user._id);
      res.json(status);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCredits(req, res) {
    try {
      const credits = await CreditManagementService.checkCredits(
        req.user._id,
        req.params.model
      );
      res.json({ credits });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new SubscriptionController();