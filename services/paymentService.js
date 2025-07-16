const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  createCheckoutSession: async (userId, plan) => {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`],
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/canceled`,
      metadata: { userId }
    });
    
    return session;
  },
  
  handleWebhook: async (event) => {
    // Handle various Stripe webhooks
    // Update user subscriptions based on events
  }
};